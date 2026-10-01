import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  prefix: "",
  theme: {
  	container: {

  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  			mono: ['var(--font-geist-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
  		},
  		boxShadow: {
  			'subtle': '0 1px 2px 0 hsl(var(--foreground) / 0.04), 0 1px 3px 0 hsl(var(--foreground) / 0.06)',
  			'raised': '0 4px 6px -1px hsl(var(--foreground) / 0.07), 0 2px 4px -2px hsl(var(--foreground) / 0.05)',
  			'panel': '0 10px 30px -12px hsl(var(--foreground) / 0.18)',
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			surface: 'hsl(var(--surface))',
  			'surface-raised': 'hsl(var(--surface-raised))',
  			success: 'hsl(var(--success))',
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				muted: 'hsl(var(--sidebar-muted))',
  				accent: 'hsl(var(--sidebar-accent))',
  				border: 'hsl(var(--sidebar-border))',
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
			lg: 'var(--radius)',
			md: 'calc(var(--radius) - 2px)',
			sm: 'calc(var(--radius) - 4px)',
			xl: 'calc(var(--radius) + 4px)',
			'2xl': 'calc(var(--radius) + 10px)'
  		},
  		keyframes: {
			'dot-blink': {
				'0%': { opacity: '0' },
				'100%': { opacity: '1' },
			  },
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			pulse: {
  				'0%, 100%': {
  					boxShadow: '0 0 0 0 var(--pulse-color)'
  				},
  				'50%': {
  					boxShadow: '0 0 0 8px var(--pulse-color)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			'spin-around': {
  				'0%': {
  					transform: 'translateZ(0) rotate(0)'
  				},
  				'15%, 35%': {
  					transform: 'translateZ(0) rotate(90deg)'
  				},
  				'65%, 85%': {
  					transform: 'translateZ(0) rotate(270deg)'
  				},
  				'100%': {
  					transform: 'translateZ(0) rotate(360deg)'
  				}
  			},
			slide: {
				to: {
					transform: 'translate(calc(100cqw - 100%), 0)'
				}
			},
			'fade-in': {
				from: { opacity: '0' },
				to: { opacity: '1' }
			},
			'fade-in-up': {
				from: { opacity: '0', transform: 'translateY(8px)' },
				to: { opacity: '1', transform: 'translateY(0)' }
			},
			'caret-blink': {
				'0%, 70%, 100%': { opacity: '1' },
				'20%, 50%': { opacity: '0' }
			},
			'bar-bounce': {
				'0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
				'50%': { transform: 'translateY(-4px)', opacity: '1' }
			},
			'overlay-in': {
				from: { opacity: '0' },
				to: { opacity: '1' }
			},
			'drawer-in': {
				from: { transform: 'translateX(-100%)' },
				to: { transform: 'translateX(0)' }
			},
			'drawer-in-rtl': {
				from: { transform: 'translateX(100%)' },
				to: { transform: 'translateX(0)' }
			},
			'recording-pulse': {
				'0%': { boxShadow: '0 0 0 0 hsl(var(--destructive) / 0.5)' },
				'70%': { boxShadow: '0 0 0 10px hsl(var(--destructive) / 0)' },
				'100%': { boxShadow: '0 0 0 0 hsl(var(--destructive) / 0)' }
			}
  		},
  		animation: {
 			'dot-blink': 'dot-blink 0.5s infinite alternate',
 			'accordion-down': 'accordion-down 0.2s ease-out',
 			'accordion-up': 'accordion-up 0.2s ease-out',
			pulse: 'pulse var(--duration) ease-out infinite',
			'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear',
			slide: 'slide var(--speed) ease-in-out infinite alternate',
			'fade-in': 'fade-in 0.2s ease-out both',
			'fade-in-up': 'fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
			'caret-blink': 'caret-blink 1.1s steps(1) infinite',
			'bar-bounce': 'bar-bounce 1s ease-in-out infinite',
			'overlay-in': 'overlay-in 0.2s ease-out both',
			'drawer-in': 'drawer-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
			'drawer-in-rtl': 'drawer-in-rtl 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
			'recording-pulse': 'recording-pulse 1.6s ease-out infinite'
  		}
		}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config