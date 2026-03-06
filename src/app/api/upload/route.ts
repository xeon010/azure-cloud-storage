import { BlobServiceClient } from "@azure/storage-blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString || connectionString === "string-from-azure-portal") {
    return NextResponse.json(
      { error: "AZURE_STORAGE_CONNECTION_STRING is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("school-files");

    // Sanitize filename — spaces and special chars break the blob URL
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const blobName = `${folder}/${Date.now()}-${safeName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(bytes, {
      blobHTTPHeaders: { blobContentType: file.type || "application/octet-stream" },
    });

    return NextResponse.json({ success: true, path: blobName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
