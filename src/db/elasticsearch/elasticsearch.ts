import { Client } from "@elastic/elasticsearch"

export const es = new Client({
  node: "http://localhost:19200",
})

export const JOBS_INDEX = "jobs";

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