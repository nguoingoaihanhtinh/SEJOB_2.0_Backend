import { Client } from "@elastic/elasticsearch"
import { env } from "../../config/env"

export const es = new Client({
  node: env.ES_HOST || "http://localhost:19200",
})

export const JOBS_INDEX = "jobs";

export async function ensureJobsIndex() {
  const exists = await es.indices.exists({ index: JOBS_INDEX });
  if (exists) {
    await es.indices.delete({ index: JOBS_INDEX });
  }

  await es.indices.create({
    index: JOBS_INDEX,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
    },
    mappings: {
      properties: {
        skills: { type: "nested" },
        categories: { type: "nested" },
        levels: { type: "nested" },
        company_branches: { type: "nested" },
        company: { type: "object" },
        search_text: { type: "text" },
      },
    },
  });
}

export const ESJob = {
  bulkIndex: async (jobs: any[]) => {
    const body = jobs.flatMap((job) => [
      { index: { _index: JOBS_INDEX, _id: job.id } },
      job,
    ])

    const response = await es.bulk({ refresh: true, body })

    if (response.errors) {
      console.error("Bulk error:", response.items)
    }
    return response
  },
  search: async (query: any) => {
    const response = await es.search({ index: JOBS_INDEX, body: query })
    return response
  },
  index: async (job: any) => {
    const response = await es.index({ index: JOBS_INDEX, id: job.id, document: job })
    return response
  },
  delete: async (jobId: number) => {
    const response = await es.delete({ index: JOBS_INDEX, id: String(jobId) }, { ignore: [404] })
    return response
  }
}