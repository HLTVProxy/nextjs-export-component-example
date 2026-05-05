import { useCounterStore } from "../store/counterStore"

const Counter = () => {
  const { count, increment, decrement } = useCounterStore()
  return (
    <div className="inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
      <button
        onClick={decrement}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-lg font-medium text-gray-600 transition hover:bg-gray-200 active:scale-95"
      >
        -
      </button>
      <span className="min-w-[2rem] text-center text-base font-semibold text-gray-800">
        {count}
      </span>
      <button
        onClick={increment}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-lg font-medium text-white transition hover:bg-indigo-600 active:scale-95"
      >
        +
      </button>
    </div>
  )
}

export default Counter
