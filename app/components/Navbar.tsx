'use client'

import { useState } from 'react'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: 'https://app.phorus.xyz', label: 'Launch App', external: true },
]

export default function Navbar() {
  const [isAtTop, setIsAtTop] = useState(true)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setIsAtTop(latest < 50)
  })

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }

  return (
    <motion.nav
      initial={false}
      animate={{
        y: isAtTop ? 20 : 0,
        borderRadius: isAtTop ? '9999px' : '0px',
        width: isAtTop ? 'auto' : '100%',
        maxWidth: isAtTop ? 'fit-content' : '100%',
        marginLeft: isAtTop ? 'auto' : '0',
        marginRight: isAtTop ? 'auto' : '0',
        paddingLeft: isAtTop ? '1.5rem' : '2rem',
        paddingRight: isAtTop ? '1.5rem' : '2rem',
        paddingTop: isAtTop ? '0.75rem' : '1rem',
        paddingBottom: isAtTop ? '0.75rem' : '1rem',
        backgroundColor: isAtTop 
          ? 'rgba(10, 31, 10, 0.8)' 
          : 'rgba(10, 31, 10, 0.95)',
        borderColor: isAtTop 
          ? 'rgba(168, 245, 208, 0.2)' 
          : 'rgba(168, 245, 208, 0.1)',
        backdropFilter: isAtTop ? 'blur(10px)' : 'blur(20px)',
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={`fixed top-0 left-0 right-0 z-50 border-b ${
        isAtTop ? 'mx-auto' : ''
      }`}
      style={{
        borderTop: isAtTop ? '1px solid rgba(168, 245, 208, 0.2)' : 'none',
        borderLeft: isAtTop ? '1px solid rgba(168, 245, 208, 0.2)' : 'none',
        borderRight: isAtTop ? '1px solid rgba(168, 245, 208, 0.2)' : 'none',
        borderBottom: isAtTop ? '1px solid rgba(168, 245, 208, 0.2)' : '1px solid rgba(168, 245, 208, 0.1)',
      }}
    >
      <div className="flex items-center justify-between">
        {/* Logo */}
        <motion.div
          animate={{
            fontSize: isAtTop ? '1.5rem' : '1.25rem',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <Link href="/" className="font-serif font-light italic text-white hover:text-mint transition-colors">
            Phorus
          </Link>
        </motion.div>

        {/* Navigation Links */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{
            opacity: isAtTop ? 0 : 1,
            x: isAtTop ? 20 : 0,
            display: isAtTop ? 'none' : 'flex',
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="hidden md:flex items-center gap-6"
        >
          {navLinks.map((link, index) => {
            const content = link.external ? (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-gray-300 hover:text-mint transition-colors px-3 py-1.5 rounded-full hover:bg-mint/10"
              >
                {link.label}
              </a>
            ) : link.href.startsWith('#') ? (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className="text-sm text-gray-300 hover:text-mint transition-colors px-3 py-1.5 rounded-full hover:bg-mint/10"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-300 hover:text-mint transition-colors px-3 py-1.5 rounded-full hover:bg-mint/10"
              >
                {link.label}
              </Link>
            )

            return (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {content}
              </motion.div>
            )
          })}
        </motion.div>

        {/* Launch App Button - Always visible */}
        <motion.div
          animate={{
            scale: isAtTop ? 1 : 0.95,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <a
            href="https://app.phorus.xyz"
            className="pill-button text-sm px-4 py-2"
          >
            Launch App
          </a>
        </motion.div>
      </div>
    </motion.nav>
  )
}
