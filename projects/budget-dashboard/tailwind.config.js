export default {
    darkMode: "class",
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                mint: {
                    50: "#f3faf6",
                    100: "#dff4e7",
                    500: "#26a269",
                    700: "#1b724a",
                },
            },
            boxShadow: {
                card: "0 12px 30px rgba(15, 23, 42, 0.08)",
            },
        },
    },
    plugins: [],
};
