import { BlobSASPermissions, BlobServiceClient } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";

export interface StoredFile {
  name: string;
  path: string;
  url: string;
  size: number;
  lastModified: string;
}

export async function GET(req: NextRequest) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString || connectionString === "string-from-azure-portal") {
    return NextResponse.json(
      { error: "AZURE_STORAGE_CONNECTION_STRING is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const folder = req.nextUrl.searchParams.get("folder") ?? "general";

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("school-files");

    const files: StoredFile[] = [];
    const prefix = `${folder}/`;

    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      const blockBlobClient = containerClient.getBlockBlobClient(blob.name);

      // Generate a read-only SAS URL valid for 1 hour
      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: BlobSASPermissions.parse("r"),
        expiresOn: new Date(Date.now() + 60 * 60 * 1000),
      });

      // Strip folder prefix + leading timestamp (e.g. "1234567890-") for display
      const rawName = blob.name.slice(prefix.length);
      const displayName = rawName.replace(/^\d+-/, "");

      files.push({
        name: displayName,
        path: blob.name,
        url: sasUrl,
        size: blob.properties.contentLength ?? 0,
        lastModified: blob.properties.lastModified?.toISOString() ?? "",
      });
    }

    // Most recently uploaded first
    files.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

    return NextResponse.json({ files });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
