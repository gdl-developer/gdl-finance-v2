import { Metadata } from '@grpc/grpc-js';

export const getGrpcMetadata = () => {
  const metadata = new Metadata();
  metadata.add('x-internal-secret', process.env.INTERNAL_SECURITY_KEY || '');
  return metadata;
};
