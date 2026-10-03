// Re-mounted on every navigation (unlike the layout), so each page fades in. See .page-enter in globals.css.
export default function LauncherTemplate({ children }) {
  return <div className="page-enter">{children}</div>
}
