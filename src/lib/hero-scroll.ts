// Shared, mutable scroll state read inside the WebGL render loop. A plain object
// (not React state) so updating it every scroll frame never triggers re-renders.
export const heroScrollState = { progress: 0 };
