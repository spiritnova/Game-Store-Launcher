import AuthGate from '../Components/Account/AuthGate'
import AchievementPopup from '../Components/UI/AchievementPopup'
import Footer from '../Components/Footer'
import Sidebar from '../Components/Sidebar'

// Every launcher page: the sidebar, the page and the footer, shown once someone is logged in.
export default function LauncherLayout({ children }) {
  return (
    <AuthGate>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="shell">
        <Sidebar />
        <div className="content">
          <div id="main" className="page">{children}</div>
          <Footer />
        </div>
      </div>
      <AchievementPopup />
    </AuthGate>
  )
}
