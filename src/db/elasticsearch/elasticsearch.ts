import { Client } from "@elastic/elasticsearch"
import { env } from "../../config/env"
import jobMapping from "./job/job.mapping.json"

export const es = new Client({
  node: env.ES_HOST || "http://localhost:19200",
})

export const JOBS_INDEX = "jobs";

export async function ensureJobsIndex() {
  // const exists = await es.indices.exists({ index: JOBS_INDEX });
  // if (exists) {
  //   // Index already exists — do NOT delete, data is preserved
  //   console.log(`[ES] Index "${JOBS_INDEX}" already exists, skipping creation.`);
  //   return;
  // }

  // await es.indices.create({
  //   index: JOBS_INDEX,
  //   settings: jobMapping.settings as any,
  //   mappings: jobMapping.mappings as any,
  // });

  // console.log(`[ES] Index "${JOBS_INDEX}" created.`);
}

/** Xóa và tạo lại index từ đầu — CHỈ dùng khi cần reset hoàn toàn */
export async function forceRecreateJobsIndex() {
  const exists = await es.indices.exists({ index: JOBS_INDEX });
  if (exists) {
    await es.indices.delete({ index: JOBS_INDEX });
    console.log(`[ES] Index "${JOBS_INDEX}" deleted.`);
  }

  await es.indices.create({
    index: JOBS_INDEX,
    settings: jobMapping.settings as any,
    mappings: jobMapping.mappings as any,
  });

  console.log(`[ES] Index "${JOBS_INDEX}" recreated.`);
}

export const ESJob = {
  bulkIndex: async (jobs: any[]) => {
    const operations = jobs.flatMap((job) => [
      { index: { _index: JOBS_INDEX, _id: job.id } },
      job,
    ]);

    const response = await es.bulk({ refresh: true, operations });

    if (response.errors) {
      console.error("Bulk error:", response.items);
    }
    return response;
  },
  search: async (query: any) => {
    // @elastic/elasticsearch v9: `body` parameter removed — must spread fields directly
    const { query: esQuery, from, size, ...rest } = query;
    const response = await es.search({
      index: JOBS_INDEX,
      query: esQuery,
      from,
      size,
      ...rest,
    });
    console.log("[ES.search] total hits:", (response as any).hits?.total);
    return response;
  },
  index: async (job: any) => {
    const response = await es.index({ index: JOBS_INDEX, id: job.id, document: job })
    return response
  },
  delete: async (jobId: number) => {
    const response = await es.delete({ index: JOBS_INDEX, id: String(jobId) }, { ignore: [404] })
    return response
  },
  /** Completion Suggester — gợi ý keyword khi user gõ từng ký tự */
  suggest: async (prefix: string, size: number = 8): Promise<string[]> => {
    const response = await es.search({
      index: JOBS_INDEX,
      suggest: {
        job_suggest: {
          prefix,
          completion: {
            field: "suggest",
            size,
            skip_duplicates: true,
            fuzzy: {
              fuzziness: 1,         // cho phép sai 1 ký tự
              min_length: 3,        // chỉ bật fuzzy khi prefix >= 3 ký tự
              prefix_length: 1,     // 1 ký tự đầu phải đúng
            },
          },
        },
      },
      _source: false,               // không cần lấy _source, chỉ cần options
    } as any);

    const options: string[] = (response as any).suggest?.job_suggest?.[0]?.options ?? [];
    return options.map((opt: any) => opt.text as string);
  },
}