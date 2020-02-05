import polygonClipping from 'polygon-clipping'

export function getNewSeg(segPoly, clip_boundary) {
    return polygonClipping.intersection([segPoly], [clip_boundary])[0][0]
}
