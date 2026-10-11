import { Menu } from 'lucide-react';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './GlobalBackground.css';

const MobileMenuButton = () => {
  const { toggleMobile } = useSidebar();
  return (
    <button
      className="mobile-menu-btn"
      onClick={toggleMobile}
      aria-label="Open navigation menu"
    >
      <Menu size={18} />
    </button>
  );
};

const AppShell = ({ children }) => {
  return (
    <div className="app-shell">
      {/* ── Global 3D watermark background — fixed, behind everything ── */}
      <div className="global-bg" aria-hidden="true">
        <div className="global-bg-img" />
        {/* Edge-fade vignette: pulls the glow away from sidebar + edges */}
        <div className="global-bg-vignette" />
      </div>

      <Sidebar />
      <div className="app-main">
        <Topbar mobileMenuSlot={<MobileMenuButton />} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
};

const AppLayout = ({ children }) => {
  return (
    <SidebarProvider>
      <AppShell>{children}</AppShell>
    </SidebarProvider>
  );
};

export default AppLayout;
