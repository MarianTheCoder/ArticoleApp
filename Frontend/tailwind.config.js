/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        xxl: '1440px',  // Custom breakpoint for very large screens
        xxxl: '1920px', // Custom breakpoint for extra-large screens
      },
      height: {
        '90h': '90%', // Custom height utility
      },
      width: {
        '90w': '90%', // Custom height utility
      },
    },
  },
  plugins: [
    function ({addUtilities}){
      const newUtilities = {
        ".scrollbar-thin" :{
          scrollbarWidth: "thin",
          scrollbarColor: "rgb(30 41 59) white",
        },
        ".scrollbar-webkit":{
          "&::-webkit-scrollbar":{
            width: "4px"
          },
          "&::-webkit-scrollbar-track" : {
            background: "none"
          },
          "&::-webkit-scrollbar-thumb" : {
            backgroundColor: "rgb(30 41 59)",
            borderRadius: "20px",
            border: "1px solid gray"
          },
        }
      }
      addUtilities(newUtilities , ["responsive", "hover"]);
    }
  ],
}

