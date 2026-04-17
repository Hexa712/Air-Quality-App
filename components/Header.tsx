"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, Car, Wind, Map, Home as HomeIcon, Heart, Sparkles, User as UserIcon } from 'lucide-react';
import styles from './Header.module.css';
import { useAuth } from '@/lib/AuthContext';
import Logo from './Logo';

const Header = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { name: 'Home', href: '/', icon: <HomeIcon size={16} /> },
    { name: 'Map', href: '/map', icon: <Map size={16} /> },
    { name: 'Crop', href: '/crop', icon: <Leaf size={16} /> },
    { name: 'Traffic', href: '/traffic', icon: <Car size={16} /> },
    {
      name: user ? 'Profile' : 'Login',
      href: user ? '/profile' : '/login',
      icon: <UserIcon size={16} />
    },
  ];

  return (
    <>
      <header className={styles.header}>
        <div className={styles.innerHeader}>
          <Link href="/" className={styles.logo}>
            <Logo size={40} />
            <span className={styles.logoText}>
              Respira<span style={{ color: '#2dd4bf', fontWeight: 800 }}>Flare</span>
            </span>
          </Link>


          {/* Desktop Navigation */}
          <nav className={styles.desktopNav}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${pathname === item.href ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navName}>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation - Fixed to screen bottom */}
      <nav className={styles.mobileNav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.mobileNavLink} ${pathname === item.href ? styles.mobileActive : ''}`}
          >
            <span className={styles.mobileNavIcon}>{item.icon}</span>
            <span className={styles.mobileNavName}>{item.name}</span>
          </Link>
        ))}
      </nav>
    </>
  );
};

export default Header;