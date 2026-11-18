import './Skeleton.css';

export default function Sk({ w = '100%', h = '1rem', r = '6px', mb, style = {} }) {
  return (
    <div
      className="sk-pulse"
      style={{ width: w, height: h, borderRadius: r, marginBottom: mb, flexShrink: 0, ...style }}
    />
  );
}
