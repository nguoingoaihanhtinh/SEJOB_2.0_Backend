import axios from "axios";

let topcvToken: string | null = null;
let tokenExpiry: number = 0;

export async function getTopCVAccessToken(): Promise<string | null> {
  if (topcvToken !== null && Date.now() < tokenExpiry) {
    return topcvToken;
  }

  try {
    const response = await axios.post(
      `${process.env.TOPCV_API_URL}/auth/login`,
      {
        email: process.env.TOPCV_SCHOOL_EMAIL,
        password: process.env.TOPCV_SCHOOL_PASSWORD,
      },
      { timeout: 1000 },
    );

    const { data } = response;
    if (!data?.success || !data.data?.access_token) {
      console.error("TopCV login failed:", data?.message || "Unknown error");
      return null;
    }

    const newToken = data.data.access_token;
    topcvToken = newToken;
    tokenExpiry = Date.now() + (data.data.expires_in ? data.data.expires_in * 1000 : 3600000);
    return newToken;
  } catch (error: any) {
    console.error("TopCV login error:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: `${process.env.TOPCV_API_URL}/auth/login`,
      email: process.env.TOPCV_SCHOOL_EMAIL,
    });
    return null;
  }
}
