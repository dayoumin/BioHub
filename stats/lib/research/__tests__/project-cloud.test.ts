import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn<typeof fetch>()
const getClientDeviceIdMock = vi.fn(() => 'device-1')

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/lib/utils/client-device-id', () => ({
  getClientDeviceId: getClientDeviceIdMock,
}))

describe('project-cloud upsertCloudResearchProject', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    getClientDeviceIdMock.mockClear()
  })

  it('falls back to POST when PATCH returns 404', async () => {
    const { upsertCloudResearchProject } = await import('../project-cloud')

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))

    await upsertCloudResearchProject({
      id: 'proj-1',
      name: 'Recovered project',
      status: 'active',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    }, false)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/projects/proj-1')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      method: 'PATCH',
    }))
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/projects')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      method: 'POST',
    }))
  })
})
