/**
 * SegmentedControl — a bordered tab strip where the active tab is filled scout-blue.
 *
 * Props:
 *   tabs    — array of { key: string, label: string }
 *   value   — the key of the currently active tab
 *   onChange — (key) => void
 */
const SegmentedControl = ({ tabs, value, onChange }) => (
  <div className="flex flex-1 border border-gray-200 rounded-lg overflow-hidden divide-x divide-gray-200">
    {tabs.map(tab => (
      <button
        key={tab.key}
        onClick={() => onChange(tab.key)}
        className={`flex-1 py-1.5 px-2 text-xs font-medium transition-colors touch-target ${
          value === tab.key ? 'bg-scout-blue text-white' : 'bg-gray-50 text-gray-500'
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default SegmentedControl;
