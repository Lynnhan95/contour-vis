import polygonClipping from 'polygon-clipping'

export function getBeltSegment(segPoly, clip_boundary) {
    let belt_segment = polygonClipping.difference([segPoly], [clip_boundary])[0][0]
}