import { useCounterStore } from "../store/counterStore"

const Counter = () => {
  const { count, increment, decrement } = useCounterStore()
  return (
    <div>Counter: {count}
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}

export default Counter
