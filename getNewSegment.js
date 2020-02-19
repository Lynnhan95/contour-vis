import polygonClipping from 'polygon-clipping'

export function getNewSegment(segPoly, clip_boundary) {
    return polygonClipping.intersection([segPoly], [clip_boundary])[0]
}