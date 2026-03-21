import { Request, Response } from "express";
import axios from "axios";
import { getTopCVAccessToken } from "@/utils/topcv-auth";
import { MY_PROVINCE_ID_TO_TOPCV_ID } from "@/utils/cityMapper";
import { getPrimaryTopCVCategory } from "@/utils/categoryMapper";
import { getTopCVExpIds } from "@/utils/levelMapper";
import { MessageUtil } from "@/utils/MessageUtil";

const topCVTotalCache = new Map<string, { total: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function fetchTopCVJobs(queryParams: {
  page?: number;
  per_page?: number;
  keyword?: string;
  city_id?: string;
  province_ids?: string;
  category_ids?: string;
  level_ids?: string;
  exp_id?: string;
}) {
  const token = await getTopCVAccessToken();
  if (!token) {
    throw new Error("TopCV authentication unavailable");
  }

  const page = queryParams.page || 1;
  const per_page = queryParams.per_page || 15;
  const { keyword, city_id, province_ids, category_ids, level_ids, exp_id } = queryParams;

  // City mapping
  let finalCityId: string | undefined;
  if (city_id) {
    finalCityId = city_id as string;
  } else if (province_ids) {
    const provId = parseInt(province_ids as string, 10);
    const topCvCityId = MY_PROVINCE_ID_TO_TOPCV_ID[provId];
    if (topCvCityId) {
      finalCityId = topCvCityId.toString();
    }
  }

  // Category mapping
  let finalCategoryId: string | undefined;
  if (category_ids) {
    const categoryIdsStr = String(category_ids).trim();
    if (categoryIdsStr) {
      const myCatIds = categoryIdsStr
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
      if (myCatIds.length >= 1) {
        const firstId = myCatIds[0];
        if (firstId !== undefined) {
          const primaryCat = getPrimaryTopCVCategory(firstId);
          if (primaryCat) {
            finalCategoryId = primaryCat.id.toString();
          }
        }
      }
    }
  }

  // Experience mapping
  let finalExpId: string | undefined;
  if (exp_id) {
    finalExpId = exp_id as string;
  } else if (level_ids) {
    const levelIdsStr = String(level_ids).trim();
    if (levelIdsStr) {
      const myLevelIds = levelIdsStr
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
      if (myLevelIds.length > 0) {
        const topcvExpIds = getTopCVExpIds(myLevelIds);
        if (topcvExpIds.length > 0) {
          finalExpId = (topcvExpIds?.[0] ?? "").toString();
        }
      }
    }
  }

  const params = {
    page,
    per_page,
    ...(keyword && { keyword }),
    ...(finalCityId && { city_id: finalCityId }),
    ...(finalCategoryId && { category_id: finalCategoryId }),
    ...(finalExpId && { exp_id: finalExpId }),
  };

  const response = await axios.get(`${process.env.TOPCV_JOBS_URL}`, {
    params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 5000,
  });

  return response;
}

export async function getTopCVTotal(params: {
  keyword?: string;
  city_id?: string;
  province_ids?: string;
  category_id?: string;
  level_ids?: string;
  exp_id?: string;
}) {
  const cacheKey = JSON.stringify(params);
  const cached = topCVTotalCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.total;
  }

  try {
    const response = await fetchTopCVJobs({
      ...params,
      page: 1,
      per_page: 5,
    });

    const total = response.data?.data?.total || 0;

    topCVTotalCache.set(cacheKey, { total, timestamp: Date.now() });

    if (topCVTotalCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of topCVTotalCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
          topCVTotalCache.delete(key);
        }
      }
    }

    return total;
  } catch (error) {
    console.error("Error fetching TopCV total:", error);
    return 0;
  }
}

export async function getTopCVwithOffset(
  offset: number,
  limit: number,
  page_size: number,
  queryParams: {
    keyword?: string;
    city_id?: string;
    province_ids?: string;
    category_id?: string;
    level_ids?: string;
    exp_id?: string;
  },
) {
  const TOPCV_PER_PAGE = page_size * 2;
  const result = [];
  let remaining = limit;

  let page = Math.floor(offset / TOPCV_PER_PAGE) + 1;
  let index = offset % TOPCV_PER_PAGE;

  while (remaining > 0) {
    try {
      const res = await fetchTopCVJobs({
        ...queryParams,
        page,
        per_page: TOPCV_PER_PAGE,
      });
      const data = res.data?.data?.data || [];

      if (!data.length) break;

      const slice = data.slice(index, index + remaining);
      result.push(...slice);

      remaining -= slice.length;
      page++;
      index = 0;
    } catch (error) {
      console.error("Error in getTopCVwithOffset:", error);
      break;
    }
  }

  return result;
}

export async function listTopCVJobs(req: Request, res: Response) {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const per_page = Math.min(100, Math.max(1, parseInt(req.query.per_page as string, 10) || 15));

  try {
    const response = await fetchTopCVJobs({
      ...req.query,
      page,
      per_page,
    });

    const { data } = response;
    if (!data.success) {
      return res.status(502).json({
        success: false,
        message: data.message || "TopCV API error",
      });
    }

    res.status(200).json({
      success: true,
      data: data.data?.data || [],
      pagination: {
        total: data.data?.total || 0,
        perPage: data.data?.perPage || per_page,
        currentPage: data.data?.currentPage || page,
      },
    });
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: MessageUtil.get("TOPCV_API_TIMEOUT"),
      });
    }
    console.error("TopCV API error in listTopCVJobs:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(502).json({
      success: false,
      message: MessageUtil.get("NETWORK_ERROR_OR_TOPCV_UNAVAILABLE"),
    });
  }
}

export async function getTopCVJobDetail(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const token = await getTopCVAccessToken();
    if (!token) {
      return res.status(502).json({
        success: false,
        message: MessageUtil.get("TOPCV_AUTHENTICATION_UNAVAILABLE"),
      });
    }
    const response = await axios.get(`${process.env.TOPCV_JOBS_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });
    const { data } = response;
    if (!data.success) {
      return res.status(502).json({
        success: false,
        message: data.message || "TopCV API error",
      });
    }
    res.status(200).json({
      success: true,
      data: data.data,
    });
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: MessageUtil.get("TOPCV_API_TIMEOUT"),
      });
    }
    console.error("TopCV API error in getTopCVJobDetail:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(502).json({
      success: false,
      message: MessageUtil.get("NETWORK_ERROR_OR_TOPCV_UNAVAILABLE"),
    });
  }
}

export async function getTopCVJobRecommend(req: Request, res: Response) {
  const { email, page = 1, per_page = 20, city_id, province_id } = req.query;
  if (!email) {
    return res.status(400).json({
      success: false,
      message: MessageUtil.get("MISSING_EMAIL_PARAMETER"),
    });
  }

  let finalCityId: string | undefined;
  if (city_id) {
    finalCityId = city_id as string;
  } else if (province_id) {
    const provId = parseInt(province_id as string, 10);
    const topCvCityId = MY_PROVINCE_ID_TO_TOPCV_ID[provId];
    if (topCvCityId) {
      finalCityId = topCvCityId.toString();
    }
  }

  const params: Record<string, any> = { email, page, per_page };
  if (finalCityId) params.city_id = finalCityId;

  try {
    const token = await getTopCVAccessToken();
    if (!token) {
      return res.status(502).json({
        success: false,
        message: MessageUtil.get("TOPCV_AUTHENTICATION_UNAVAILABLE"),
      });
    }
    const response = await axios.get(`${process.env.TOPCV_JOBS_URL}/recommend`, {
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 5000,
    });
    const { data } = response;
    if (!data.success) {
      return res.status(502).json({
        success: false,
        message: data.message || "TopCV API error",
      });
    }
    res.status(200).json({
      success: true,
      data: data.data?.data || [],
      pagination: {
        total: data.data?.total || 0,
        perPage: data.data?.perPage || per_page,
        currentPage: data.data?.currentPage || page,
      },
    });
  } catch (error: any) {
    if (error.code === "ECONNABORTED") {
      return res.status(504).json({
        success: false,
        message: MessageUtil.get("TOPCV_API_TIMEOUT"),
      });
    }
    console.error("TopCV API error in getTopCVJobRecommend:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    });
    res.status(502).json({
      success: false,
      message: MessageUtil.get("NETWORK_ERROR_OR_TOPCV_UNAVAILABLE"),
    });
  }
}
