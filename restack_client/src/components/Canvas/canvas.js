import React, { useRef, useEffect } from 'react'

const Canvas = props => {
  
    const canvasRef = useRef(null)
    // Keep a stable ref to the latest draw function and data so the RAF loop
    // never needs to restart when the parent re-renders.  The useEffect runs
    // only once (on mount) and the cleanup only fires on unmount.
    const drawRef = useRef(props.draw)
    const dataRef = useRef(props.data)

    // Sync the refs every render — no new RAF loop needed.
    drawRef.current = props.draw
    dataRef.current = props.data

    useEffect(() => {
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        let frameCount = 0
        let animationFrameId
        
        const render = () => {
            frameCount++
            if (dataRef.current) {
                drawRef.current(context, frameCount, dataRef.current)
            } else {
                drawRef.current(context, frameCount)
            }
            animationFrameId = window.requestAnimationFrame(render)
        }
        render()
        
        return () => {
            window.cancelAnimationFrame(animationFrameId)
        }
    // Empty dep array: start the loop once on mount, stop it on unmount.
    // drawRef/dataRef are always current without being deps.
    }, [])
  
    const { draw, data, ...rest } = props
    return <canvas ref={canvasRef} {...rest}/>
}

export default Canvas

// import React from 'react'
// import useCanvas from './useCanvas'

// const Canvas = props => {  
  
//   const { draw, ...rest } = props
//   const canvasRef = useCanvas(draw)
  
//   return <canvas height={props.size} width={props.size} ref={canvasRef} {...rest}/>
// }

// export default Canvas