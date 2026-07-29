import type {MediaProbePort} from "#server/apod/ports";
import {getImageSize} from "#server/utils/getImageSize";

// getImageSize already returns exactly { width, height } | null, it IS the port.
export const imageProbe: MediaProbePort = {
    probeSize: getImageSize,
};
