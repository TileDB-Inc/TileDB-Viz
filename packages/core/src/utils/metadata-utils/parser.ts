import {
  SOMAMultiscaleImageAssetMetadata,
  SOMAMultiscaleImageAssetMetadataRaw
} from '../../tile';

export function toSOMAMultiscaleImageMetadata(
  assetMetadata: SOMAMultiscaleImageAssetMetadataRaw
): SOMAMultiscaleImageAssetMetadata {
  return {
    soma_coordinate_space: JSON.parse(assetMetadata.soma_coordinate_space),
    soma_encoding_version: assetMetadata.soma_encoding_version,
    soma_multiscale_image_schema: JSON.parse(
      assetMetadata.soma_multiscale_image_schema
    )
  };
}
