import {
    AssetType,
    ImageAssetOptions,
    AssetEntry
} from '@tiledb-inc/viz-common';
import {
    registerAssetFactory,
    AssetFactoryContext,
    AssetFactoryResult
} from './assetFactory';
import { ImageManager } from '../model/image/imageManager';
import { inv, MathArray, matrix } from 'mathjs';
import OpenSlide from "@conflux-xyz/openslide-wasm";
import { BoundingInfo, Vector3 } from '@babylonjs/core';
import { Channel, SVSImageMetadata } from '../types';
import { constructImageTileset, SVSImageFetcher } from '../fetchers';
import { tileDBUriParser } from '../../utils/metadata-utils';
import { getImageMetadata } from '../../utils/metadata-utils/metadata-utils';
import { Datatype } from '@tiledb-inc/tiledb-cloud/v3';

registerAssetFactory(
    AssetType.SVS_IMAGE,
    async (
        entry: AssetEntry,
        ctx: AssetFactoryContext
    ): Promise<AssetFactoryResult> => {
        const opts = entry.options as ImageAssetOptions;
        const openslide = new OpenSlide();
        await openslide.initialize();
        const image = opts.token ? await fetch(opts.uri, {
            headers: { Authorization: `Bearer ${opts.token}` }
        }).then(response => response.arrayBuffer()).then(buffer => new File([buffer as BlobPart], "image.svs")).then(file => openslide.open(file)) : await openslide.open(opts.uri);
        const extent = await image.getLevelDimensions(0);
        const extent_max = await image.getLevelDimensions(await image.getLevelCount());
        ctx.sceneOptions.extents.encapsulateBoundingInfo(
            new BoundingInfo(new Vector3(0, 0, 0), new Vector3(extent[0], extent[1], 0))
        );

        const properties = await image.getPropertyNames();
        const defaultScaleX = Number.parseFloat(await image.getPropertyValue('aperio.MPP' in properties ? 'aperio.MPP' : 'openslide.mpp-x') ?? '1');
        const defaultScaleY = Number.parseFloat(await image.getPropertyValue('aperio.MPP' in properties ? 'aperio.MPP' : 'openslide.mpp-y') ?? '1');
        const scale = Math.round(extent_max[0] / extent[0]);

        const metadata: SVSImageMetadata = {
            id: opts.uri,
            uri: opts.uri,
            name: opts.name ?? "",
            root: constructImageTileset(await Promise.all(Array.from({ length: await image.getLevelCount() }, (_, i) => i).map(async (i) => {
                const extent = await image.getLevelDimensions(i);
                return {
                    width: [0, extent[0] - 1],
                    height: [0, extent[1] - 1]
                }
            }))),
            channels: new Map([
                ["intensity", [{
                    "id": "0",
                    "name": "red",
                    "color": {
                        "red": 255,
                        "green": 0,
                        "blue": 0,
                        "alpha": 255
                    },
                    "intensity": 255.0,
                    "min": 0.0,
                    "max": 255.0,
                    "visible": true
                } as Channel,
                {
                    "id": "1",
                    "name": "green",
                    "color": {
                        "red": 0,
                        "green": 255,
                        "blue": 0,
                        "alpha": 255
                    },
                    "intensity": 255.0,
                    "min": 0.0,
                    "max": 255.0,
                    "visible": true
                } as Channel,
                {
                    "id": "2",
                    "name": "blue",
                    "color": {
                        "red": 0,
                        "green": 0,
                        "blue": 255,
                        "alpha": 255
                    },
                    "intensity": 255.0,
                    "min": 0.0,
                    "max": 255.0,
                    "visible": true
                } as Channel]]
            ]),
            attributes: [{ name: "intensity", visible: true, type: Datatype.Uint8 }],
            extraDimensions: [],
            pixelToCRS: matrix([
                [defaultScaleX * scale, 0, 0, 0],
                [0, defaultScaleY * scale, 0, 0],
                [0, 0, scale, 0],
                [0, 0, 0, 1]
            ] as MathArray)
        };

        return {
            manager: new ImageManager(ctx.scene, ctx.workerPool, {
                metadata,
                sceneOptions: ctx.sceneOptions,
            }, new SVSImageFetcher(ctx.workerPool, image)),
            pickable: false,
            minimap: true,
            cacheKeys: []
        };
    }
);

registerAssetFactory(
    AssetType.IMAGE,
    async (
        entry: AssetEntry,
        ctx: AssetFactoryContext
    ): Promise<AssetFactoryResult> => {
        const opts = entry.options as ImageAssetOptions;
        const { workspace, teamspace, id } = tileDBUriParser(
            opts.uri,
            ctx.workspace!,
            ctx.teamspace!
        );

        const metadata = await getImageMetadata(
            {
                token: ctx.token!,
                tiledbEnv: ctx.tiledbEnv,
                workspace,
                teamspace,
                // Determine if URI is array or group based on metadata
                // The metadata fetcher handles both cases
                groupID: id
            },
            opts
        );

        // Apply default channels if provided
        if (opts.defaultChannels) {
            const defaultAttribute = metadata.attributes.filter(
                x => x.visible
            )[0]?.name;

            if (defaultAttribute) {
                for (const channel of metadata.channels.get(defaultAttribute) ?? []) {
                    channel.visible = false;
                }

                for (const entry of opts.defaultChannels) {
                    const channel = metadata.channels
                        .get(defaultAttribute)
                        ?.at(entry.index);

                    if (!channel) {
                        continue;
                    }

                    channel.visible = true;
                    channel.intensity = entry.intensity ?? channel.intensity;
                    channel.color = entry.color
                        ? {
                            red: entry.color.r,
                            green: entry.color.g,
                            blue: entry.color.b,
                            alpha: 1.0
                        }
                        : channel.color;
                }
            }
        }

        // Set CRS and transformation from image metadata
        ctx.sceneOptions.crs = metadata.crs;
        ctx.sceneOptions.transformation = metadata.pixelToCRS
            ? inv(metadata.pixelToCRS)
            : undefined;
        ctx.sceneOptions.extents.encapsulateBoundingInfo(
            metadata.root.boundingInfo
        );

        return {
            manager: new ImageManager(ctx.scene, ctx.workerPool, {
                metadata,
                sceneOptions: ctx.sceneOptions
            }),
            pickable: false,
            minimap: true,
            cacheKeys: metadata.uris
        };
    }
);
