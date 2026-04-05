/**
 * SegmentedControl — pill outline style; active segment is scout-blue fill.
 *
 * Props:
 *   tabs     — array of { key: string, label: string }
 *   value    — the key of the currently active tab
 *   onChange — (key) => void
 */
const SegmentedControl = ({ tabs, value, onChange }) => (
  <div className="flex w-full gap-2">
    {tabs.map((tab) => (
      <button
        type="button"
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={`flex-1 rounded-full border-2 py-2 px-2 text-sm font-medium transition-[color,background-color,border-color] touch-target min-h-11 box-border ${
          value === tab.key
            ? 'border-scout-blue !bg-scout-blue/12 !text-scout-blue'
            : 'border-[#d1d5db] !bg-white text-gray-900 hover:border-gray-400'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
