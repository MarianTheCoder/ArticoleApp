/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			screens: {
				xxl: '1440px',
				xxxl: '1920px'
			},
			height: {
				'90h': '90%'
			},
			width: {
				'90w': '90%'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			colors: {
				low: 'hsl(var(--low))',
				medium: 'hsl(var(--medium))',
				high: 'hsl(var(--high))',
				background: 'hsl(var(--background))',
				backgroundSecond: "hsl(var(--mainBG))", // ✅ add this
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			}
		}
	},
	plugins: [
		function ({ addUtilities }) {
			const newUtilities = {
				".scrollbar-thin": {
					scrollbarWidth: "thin",
					scrollbarColor: "black", // thumb, track
				},
				".scrollbar-webkit": {
					"&::-webkit-scrollbar": {
						width: "4px",
						height: "4px",
					},
					"&::-webkit-scrollbar-track": {
						backgroundColor: "black",
					},
					"&::-webkit-scrollbar-track-piece": {
						backgroundColor: "black",
					},
					"&::-webkit-scrollbar-corner": {
						backgroundColor: "black",
					},
					"&::-webkit-scrollbar-thumb": {
						backgroundColor: "rgb(30 41 59)",
						borderRadius: "9999px",
						border: "0px solid transparent", // remove white border
					},
				},
			};

			addUtilities(newUtilities, ["responsive", "hover"]);
		},
		require("tailwindcss-animate"),
	],
}

