import "server-only";

import { serverEnvironment } from "@/lib/env/server";

export const objectStorageConfig = Object.freeze({
  endpoint: serverEnvironment.S3_ENDPOINT,
  region: serverEnvironment.S3_REGION,
  privateBucket: serverEnvironment.S3_BUCKET_PRIVATE,
  publicBucket: serverEnvironment.S3_BUCKET_PUBLIC,
  forcePathStyle: serverEnvironment.S3_FORCE_PATH_STYLE,
});
