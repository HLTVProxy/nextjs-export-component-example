import { useState } from "react"

const Counter = () => {
  const [count, setCount] = useState(0)
  return (
    <div>Counter: {count}
      <button onClick={() => setCount(count + 1)}>+</button>
      <button onClick={() => setCount(count - 1)}>-</button>
    </div>
  )
}

export default Counter