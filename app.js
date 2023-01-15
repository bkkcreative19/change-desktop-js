import express from "express";
import fileUpload from "express-fileupload";
import { BlockBlobClient, BlobServiceClient } from "@azure/storage-blob";
import getStream from "into-stream";
import dotenv from "dotenv";
import path from "path";

import filesPayloadExists from "./middleware/filesPayloadExits.js";
import fileExtLimiter from "./middleware/fileExtLimiter.js";
import fileSizeLimiter from "./middleware/fileSizeLimiter.js";

import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;

const app = express();

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.post(
  "/upload",
  fileUpload({ createParentPath: true }),
  filesPayloadExists,
  fileExtLimiter([".png", ".jpg", ".jpeg"]),
  fileSizeLimiter,
  (req, res) => {
    const files = req.files;
    // console.log(files);

    const getBlobName = (originalName) => {
      const identifier = Math.random().toString().replace(/0\./, ""); // remove "0." from start of string
      return `${identifier}-${originalName}`;
    };

    Object.keys(files).forEach(async (key) => {
      if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        throw Error("Azure Storage Connection string not found");
      }

      // const blobServiceClient = BlobServiceClient.fromConnectionString(
      //   process.env.AZURE_STORAGE_CONNECTION_STRING
      // );

      // const containerClient = blobServiceClient.getContainerClient(
      //   process.env.AZURE_STORAGE_CONTAINER_NAME
      // );

      const blobName = getBlobName(files[key].name);
      // console.log(blobName);
      // const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // console.log(
      //   `\nUploading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`
      // );

      const data = getStream(files[key].data);
      const length = files[key].data.length;

      // const uploadBlobResponse = await blockBlobClient.uploadStream(
      //   data,
      //   length,
      //   { blobHTTPHeaders: { blobContentType: "image/jpeg" } }
      // );

      // console.log(
      //   `Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`
      // );
      // res.render("success", {
      //   message: "File uploaded to Azure Blob storage.",
      // });

      // Create the BlobServiceClient object with connection string

      const blobService = new BlockBlobClient(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        process.env.AZURE_STORAGE_CONTAINER_NAME,
        blobName
      );

      // console.log(blobService);
      const stream = getStream(files[key].data);
      const streamLength = files[key].data.length;
      blobService
        .uploadStream(stream, streamLength, 5, {
          blobHTTPHeaders: { blobContentType: "image/jpeg" },
        })
        .then((data) => {
          console.log(blobName);
        })
        .catch((err) => {
          if (err) {
            console.log(err);
            // handleError(err);
            return;
          }
        });
      // const filepath = path.join(__dirname, "files", files[key].name);
      // files[key].mv(filepath, (err) => {
      //   if (err) return res.status(500).json({ status: "error", message: err });
      // });
    });

    return res.json({
      status: "success",
      message: Object.keys(files).toString(),
    });
  }
);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
