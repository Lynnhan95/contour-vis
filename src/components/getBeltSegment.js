import polygonClipping from 'polygon-clipping'

export function getBeltSegment(segPoly, clip_boundary) {
    return polygonClipping.difference([segPoly], [clip_boundary])[0][0]
}