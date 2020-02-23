
export function interpolateSegment(segPoly, num) {
        /**
         * A: median point
         * B: intersect point
         */
        let [A1, A2, B2, B1] = segPoly

        let interpolatePair = [ [A1, A2] ]
        for (let i=1; i< num; i++) {
            // [M, N]
            let Mx, My
            Mx = (1 - i/ num) * A1[0] + ( i/ num ) * B1[0]
            My = (1 - i/ num) * A1[1] + ( i/ num ) * B1[1]

            let Nx, Ny
            Nx = (1 - i/ num) * A2[0] + ( i/ num ) * B2[0]
            Ny = (1 - i/ num) * A2[1] + ( i/ num ) * B2[1]

            interpolatePair.push([[Mx, My], [Nx, Ny]])
        }
        interpolatePair.push( [B1, B2])

        let subSegments = []
        for (let i=0; i< interpolatePair.length-1; i++) {
            let firstPair = interpolatePair[i]
            let secondPair = interpolatePair[i+1]
            let singleRegion = [ firstPair[0], secondPair[0], secondPair[1], firstPair[1] ]
            subSegments.push(singleRegion)
        }

        return subSegments

}
