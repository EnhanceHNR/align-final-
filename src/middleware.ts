import { withAuth } from "next-auth/middleware";

export default withAuth({
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/",
    },
    cookies: {
        sessionToken: {
            name: "align_token",
        },
    },
});

export const config = {
    matcher: [
        "/dashboard",
        "/dashboard/:path*",
        "/patients/:path*",
        "/appointments/:path*",
        "/treatments/:path*",
        "/invoices/:path*",
        "/superadmin/:path*",
    ],
};
