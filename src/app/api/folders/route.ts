import { BlobServiceClient } from "@azure/storage-blob";
import { NextResponse } from "next/server";

export async function GET() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString || connectionString === "string-from-azure-portal") {
    return NextResponse.json(
      { error: "AZURE_STORAGE_CONNECTION_STRING is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient("school-files");

    const folders = new Set<string>();

    // listBlobsByHierarchy with "/" delimiter returns virtual folders as prefixes
    for await (const item of containerClient.listBlobsByHierarchy("/")) {
      if (item.kind === "prefix") {
        // Prefix is like "devops/" — strip the trailing slash
        folders.add(item.name.replace(/\/$/, ""));
      }
    }

    return NextResponse.json({ folders: Array.from(folders).sort() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
