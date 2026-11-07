<template>
  <div class="dashboard page-wrapper" v-if="event">
    <AppTopNav mode="event" :event="event" currentTitle="Analytics" />

    <div class="app-page-layout analytics-container">
      <!-- Loading State -->
      <div v-if="loading && !analytics" class="loading-state">
        <div class="spinner"></div>
        <p>Loading analytics data...</p>
      </div>

      <div v-else-if="analytics">
        <!-- Dashboard Header Actions -->
        <div class="analytics-header">
          <div class="header-titles">
            <h1 class="page-title">{{ event.name }} Analytics</h1>
            <p class="page-subtitle">
              {{ event.date ? formatDate(event.date) : 'Live Metrics' }} · 
              <span class="status-pill" :class="'status-' + (event.status || 'active')">{{ event.status || 'Active' }}</span>
              <span v-if="analytics.timeline?.peakHour" class="peak-badge">
                Peak: {{ formatHour(analytics.timeline.peakHour) }}
              </span>
            </p>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="fetchData(true)" :disabled="refreshing" title="Refresh data">
              <svg :class="{ 'spin-anim': refreshing }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span>{{ refreshing ? 'Refreshing...' : 'Refresh' }}</span>
            </button>

            <button class="btn btn-secondary" @click="exportCSV" title="Export session analytics and activity logs as CSV">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <!-- KPI Grid -->
        <section class="kpi-grid">
          <!-- 1. Sessions -->
          <div class="kpi-card">
            <div class="kpi-icon icon-green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Booth Sessions</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ summary.totalSessions }}</span>
                <span class="kpi-tag tag-green">{{ summary.completedSessions }} completed</span>
              </div>
              <span class="kpi-subtext">~{{ summary.totalPhotos }} individual photos captured</span>
            </div>
          </div>

          <!-- 2. Gallery Views -->
          <div class="kpi-card">
            <div class="kpi-icon icon-purple">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Gallery Views</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ summary.totalViews }}</span>
                <span class="kpi-tag tag-purple">{{ summary.qrScans }} QR</span>
              </div>
              <span class="kpi-subtext">{{ summary.directVisits }} direct gallery links</span>
            </div>
          </div>

          <!-- 3. Unique Visitors -->
          <div class="kpi-card">
            <div class="kpi-icon icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Unique Audience</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ summary.uniqueVisitors }}</span>
                <span class="kpi-tag tag-blue">{{ conversionRate }}% rate</span>
              </div>
              <span class="kpi-subtext">Distinct visitor devices</span>
            </div>
          </div>

          <!-- 4. Downloads -->
          <div class="kpi-card">
            <div class="kpi-icon icon-cyan">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Downloads</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ summary.totalDownloads }}</span>
                <span class="kpi-tag tag-cyan">{{ summary.zipDownloads }} zip</span>
              </div>
              <span class="kpi-subtext">{{ summary.photoDownloads }} individual photo downloads</span>
            </div>
          </div>

          <!-- 5. Email Shares -->
          <div class="kpi-card">
            <div class="kpi-icon icon-orange">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Email Sends</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ summary.emailsSent }}</span>
                <span v-if="summary.emailsTotal > 0" class="kpi-tag tag-orange">{{ Math.round((summary.emailsSent / summary.emailsTotal) * 100) }}% ok</span>
              </div>
              <span class="kpi-subtext">{{ summary.emailsTotal }} delivery requests</span>
            </div>
          </div>

          <!-- 6. Data Processed -->
          <div class="kpi-card">
            <div class="kpi-icon icon-yellow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div class="kpi-body">
              <span class="kpi-label">Booth Sync Bandwidth</span>
              <div class="kpi-value-row">
                <span class="kpi-value">{{ formatBytes(summary.totalDataBytes) }}</span>
              </div>
              <span class="kpi-subtext">Avg speed: {{ summary.avgSessionSpeedKbps || 0 }} kbps</span>
            </div>
          </div>
        </section>

        <!-- Timeline Chart Section -->
        <section class="card timeline-card" v-if="timelinePoints.length > 0">
          <div class="card-header-row">
            <div>
              <h2>Activity Timeline</h2>
              <p class="card-desc">Hourly breakdown of photo captures, gallery views, and photo downloads.</p>
            </div>
            <div class="chart-legend">
              <span class="legend-item"><span class="legend-dot dot-sessions"></span> Sessions</span>
              <span class="legend-item"><span class="legend-dot dot-views"></span> Views</span>
              <span class="legend-item"><span class="legend-dot dot-downloads"></span> Downloads</span>
            </div>
          </div>

          <div class="chart-container">
            <div class="chart-bars">
              <div 
                v-for="point in timelinePoints" 
                :key="point.hour" 
                class="chart-bar-group"
                :title="`${formatHour(point.hour)}: ${point.sessions} sessions, ${point.views} views, ${point.downloads} downloads`"
              >
                <div class="bar-stack">
                  <div 
                    class="bar-segment bar-downloads" 
                    :style="{ height: getBarHeight(point.downloads) + '%' }"
                    v-if="point.downloads > 0"
                  ></div>
                  <div 
                    class="bar-segment bar-views" 
                    :style="{ height: getBarHeight(point.views) + '%' }"
                    v-if="point.views > 0"
                  ></div>
                  <div 
                    class="bar-segment bar-sessions" 
                    :style="{ height: getBarHeight(point.sessions) + '%' }"
                    v-if="point.sessions > 0"
                  ></div>
                </div>
                <span class="bar-label">{{ formatHourShort(point.hour) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Breakdowns Grid -->
        <div class="breakdown-grid">
          <!-- Devices & Sources -->
          <section class="card">
            <h2>Devices & Traffic Channels</h2>
            <p class="card-desc">Visitor hardware and access methods.</p>

            <div class="channel-bar-wrap">
              <div class="channel-bar-header">
                <span>QR Scans ({{ summary.qrScans }})</span>
                <span>Direct Links ({{ summary.directVisits }})</span>
              </div>
              <div class="channel-progress">
                <div class="progress-qr" :style="{ width: qrPercentage + '%' }" :title="`QR: ${qrPercentage}%`"></div>
                <div class="progress-direct" :style="{ width: (100 - qrPercentage) + '%' }" :title="`Direct: ${100 - qrPercentage}%`"></div>
              </div>
            </div>

            <div class="breakdown-list">
              <div v-for="dev in devices" :key="dev.name" class="breakdown-row">
                <div class="breakdown-info">
                  <span class="breakdown-name">{{ dev.name }}</span>
                  <span class="breakdown-stat">{{ dev.count }} ({{ dev.percent }}%)</span>
                </div>
                <div class="mini-bar-track">
                  <div class="mini-bar-fill fill-blue" :style="{ width: dev.percent + '%' }"></div>
                </div>
              </div>
              <div v-if="devices.length === 0" class="muted-note">No device data yet.</div>
            </div>
          </section>

          <!-- OS & Platforms -->
          <section class="card">
            <h2>Operating Systems & Browsers</h2>
            <p class="card-desc">Platforms used by visitors.</p>

            <div class="breakdown-list">
              <div class="breakdown-subhead">Operating Systems</div>
              <div v-for="o in osList" :key="o.name" class="breakdown-row">
                <div class="breakdown-info">
                  <span class="breakdown-name">{{ o.name }}</span>
                  <span class="breakdown-stat">{{ o.count }} ({{ o.percent }}%)</span>
                </div>
                <div class="mini-bar-track">
                  <div class="mini-bar-fill fill-purple" :style="{ width: o.percent + '%' }"></div>
                </div>
              </div>

              <div class="breakdown-subhead top-gap">Top Browsers</div>
              <div class="tag-cloud">
                <span v-for="b in browsers" :key="b.name" class="browser-badge">
                  {{ b.name }} <strong>{{ b.count }}</strong>
                </span>
                <span v-if="browsers.length === 0" class="muted-note">No browser data yet.</span>
              </div>
            </div>
          </section>
        </div>

        <!-- NEW: Per-Session Stats Table -->
        <section class="card session-stats-card">
          <div class="card-header-row">
            <div>
              <div class="section-title-wrap">
                <h2>Session Performance</h2>
                <span class="counter-pill">{{ filteredSessions.length }} session{{ filteredSessions.length !== 1 ? 's' : '' }}</span>
              </div>
              <p class="card-desc">Per-session breakdown of gallery views, unique viewers, individual photo downloads, and ZIP downloads.</p>
            </div>

            <!-- Session Controls -->
            <div class="table-filters">
              <div class="sort-select-wrap">
                <label class="filter-label">Sort by:</label>
                <select v-model="sessionSortKey" class="filter-select">
                  <option value="created_at_desc">Newest First</option>
                  <option value="created_at_asc">Oldest First</option>
                  <option value="views_desc">Most Views</option>
                  <option value="unique_visitors_desc">Most Unique Viewers</option>
                  <option value="individual_downloads_desc">Most Individual Downloads</option>
                  <option value="zip_downloads_desc">Most ZIP Downloads</option>
                  <option value="total_downloads_desc">Most Total Downloads</option>
                </select>
              </div>

              <input 
                type="text" 
                v-model="sessionSearchQuery" 
                placeholder="Search session ID or title..." 
                class="search-input"
              />
            </div>
          </div>

          <div class="settings-box">
            <table class="session-table" v-if="paginatedSessions.length > 0">
              <thead>
                <tr>
                  <th @click="toggleSessionSort('id')" class="sortable-th">
                    Session
                    <span class="sort-indicator" v-if="sessionSortField === 'id'">{{ sessionSortOrder === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th>Status</th>
                  <th @click="toggleSessionSort('views')" class="sortable-th num-col">
                    Views
                    <span class="sort-indicator" v-if="sessionSortField === 'views'">{{ sessionSortOrder === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="toggleSessionSort('unique_visitors')" class="sortable-th num-col">
                    Unique Viewers
                    <span class="sort-indicator" v-if="sessionSortField === 'unique_visitors'">{{ sessionSortOrder === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="toggleSessionSort('individual_downloads')" class="sortable-th num-col">
                    Individual Downloads
                    <span class="sort-indicator" v-if="sessionSortField === 'individual_downloads'">{{ sessionSortOrder === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="toggleSessionSort('zip_downloads')" class="sortable-th num-col">
                    Download ZIP
                    <span class="sort-indicator" v-if="sessionSortField === 'zip_downloads'">{{ sessionSortOrder === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th @click="toggleSessionSort('total_downloads')" class="sortable-th num-col">
                    Total Downloads
                    <span class="sort-indicator" v-if="sessionSortField === 'total_downloads'">{{ sessionSortOrder === 'asc' ? '▲' : '▼' }}</span>
                  </th>
                  <th class="actions-col">Share Link</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sess in paginatedSessions" :key="sess.id">
                  <td class="session-main-cell" data-label="Session">
                    <div class="session-cell-wrap">
                      <div class="session-icon">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <div class="session-text">
                        <span class="session-id-text" :title="sess.id">{{ formatSessionId(sess.id) }}</span>
                        <span class="session-time-text">{{ formatTime(sess.created_at) }}</span>
                        <span v-if="sess.share_title" class="session-title-tag">{{ sess.share_title }}</span>
                      </div>
                    </div>
                  </td>

                  <td data-label="Status">
                    <span class="badge" :class="sess.archived === 1 ? 'badge-gray' : (sess.upload_status === 'complete' ? 'badge-green' : 'badge-yellow')">
                      {{ sess.archived === 1 ? 'archived' : (sess.upload_status || 'complete') }}
                    </span>
                  </td>

                  <td data-label="Views" class="num-col">
                    <span class="metric-badge metric-purple">
                      {{ sess.views }}
                    </span>
                  </td>

                  <td data-label="Unique Viewers" class="num-col">
                    <span class="metric-badge metric-blue">
                      {{ sess.unique_visitors }}
                    </span>
                  </td>

                  <td data-label="Individual Downloads" class="num-col">
                    <span class="download-cell" :class="{ 'has-val': sess.individual_downloads > 0 }">
                      {{ sess.individual_downloads }}
                    </span>
                  </td>

                  <td data-label="Download ZIP" class="num-col">
                    <span class="download-cell" :class="{ 'has-val': sess.zip_downloads > 0 }">
                      <svg v-if="sess.zip_downloads > 0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-zip-icon">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      {{ sess.zip_downloads }}
                    </span>
                  </td>

                  <td data-label="Total Downloads" class="num-col">
                    <strong class="total-downloads-text" :class="{ 'total-highlight': sess.total_downloads > 0 }">
                      {{ sess.total_downloads }}
                    </strong>
                  </td>

                  <td data-label="Share Link" class="actions-col">
                    <div class="action-buttons-wrap">
                      <a 
                        v-if="sess.share_id || sess.id"
                        :href="`/share/${sess.share_id || sess.id}`" 
                        target="_blank" 
                        class="action-pill-btn"
                        title="Open guest share gallery"
                      >
                        <span>Share</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                      <button 
                        @click="router.push(`/events/${eventId}?session=${sess.id}`)"
                        class="action-pill-btn action-admin"
                        title="View session photos in booth feed"
                      >
                        <span>Feed</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>

              <!-- Summary Totals Footer -->
              <tfoot v-if="filteredSessions.length > 0">
                <tr class="table-totals-row">
                  <td class="total-label-cell">
                    <strong>Total ({{ filteredSessions.length }} sessions)</strong>
                  </td>
                  <td>-</td>
                  <td class="num-col"><strong>{{ sessionTotals.views }}</strong></td>
                  <td class="num-col"><strong>{{ sessionTotals.unique_visitors }}</strong></td>
                  <td class="num-col"><strong>{{ sessionTotals.individual_downloads }}</strong></td>
                  <td class="num-col"><strong>{{ sessionTotals.zip_downloads }}</strong></td>
                  <td class="num-col"><strong>{{ sessionTotals.total_downloads }}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div v-else class="app-empty-state">
              <p>No sessions found matching search.</p>
            </div>

            <!-- Sessions Pagination Bar -->
            <div class="pagination-bar" v-if="filteredSessions.length > sessionPageSize">
              <span class="page-info">
                Showing {{ ((sessionCurrentPage - 1) * sessionPageSize) + 1 }} to {{ Math.min(sessionCurrentPage * sessionPageSize, filteredSessions.length) }} of {{ filteredSessions.length }} sessions
              </span>
              <div class="page-btns">
                <button 
                  class="page-btn" 
                  :disabled="sessionCurrentPage === 1" 
                  @click="sessionCurrentPage--"
                >
                  Previous
                </button>
                <span class="page-current">{{ sessionCurrentPage }} / {{ totalSessionPages }}</span>
                <button 
                  class="page-btn" 
                  :disabled="sessionCurrentPage >= totalSessionPages" 
                  @click="sessionCurrentPage++"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Top Downloads Section (if any) -->
        <section class="card" v-if="topDownloads.length > 0">
          <h2>Popular Download Targets</h2>
          <p class="card-desc">Most requested files and bundles across the entire event.</p>
          <div class="top-downloads-grid">
            <div v-for="item in topDownloads" :key="item.file" class="download-item">
              <div class="download-file-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div class="download-meta">
                <span class="download-name">{{ item.file === 'all' ? 'All Photos (ZIP Archive)' : item.file }}</span>
                <span class="download-badge">{{ item.count }} download{{ item.count !== 1 ? 's' : '' }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Recent Activity Feed -->
        <section class="card">
          <div class="card-header-row">
            <div>
              <h2>Recent Activity Log</h2>
              <p class="card-desc">Chronological interactions with the booth, gallery, and downloads.</p>
            </div>
            
            <!-- Filters -->
            <div class="table-filters">
              <div class="filter-tabs">
                <button 
                  v-for="f in filterOptions" 
                  :key="f.key" 
                  class="filter-tab" 
                  :class="{ active: currentFilter === f.key }"
                  @click="currentFilter = f.key"
                >
                  {{ f.label }}
                </button>
              </div>
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="Search activity..." 
                class="search-input"
              />
            </div>
          </div>

          <div class="settings-box">
            <table class="logs-table" v-if="filteredActivity.length > 0">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Source</th>
                  <th>Device / Platform</th>
                  <th>Target / Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in paginatedActivity" :key="item.id">
                  <td class="log-time" data-label="Time">{{ formatTime(item.created_at) }}</td>
                  <td data-label="Event">
                    <span class="badge" :class="getActionBadgeClass(item.type)">
                      {{ item.type }}
                    </span>
                  </td>
                  <td data-label="Source">
                    <span class="badge badge-purple" v-if="item.source === 'qr'">QR</span>
                    <span class="badge badge-green" v-else-if="item.source === 'booth'">Booth</span>
                    <span class="badge badge-gray" v-else>Direct</span>
                  </td>
                  <td class="log-device" data-label="Device">{{ item.device }}</td>
                  <td class="log-target" data-label="Target" :title="item.target || item.title">
                    {{ item.target || item.title }}
                  </td>
                  <td class="log-ip" data-label="IP">{{ item.ip }}</td>
                </tr>
              </tbody>
            </table>
            
            <div v-else class="app-empty-state">
              <p>No activity matching filter.</p>
            </div>

            <!-- Activity Pagination Bar -->
            <div class="pagination-bar" v-if="filteredActivity.length > pageSize">
              <span class="page-info">
                Showing {{ ((currentPage - 1) * pageSize) + 1 }} to {{ Math.min(currentPage * pageSize, filteredActivity.length) }} of {{ filteredActivity.length }} events
              </span>
              <div class="page-btns">
                <button 
                  class="page-btn" 
                  :disabled="currentPage === 1" 
                  @click="currentPage--"
                >
                  Previous
                </button>
                <span class="page-current">{{ currentPage }} / {{ totalPages }}</span>
                <button 
                  class="page-btn" 
                  :disabled="currentPage >= totalPages" 
                  @click="currentPage++"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppTopNav from '../components/ui/AppTopNav.vue'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

const eventId = computed(() => route.params.id as string)
const event = ref<any>(null)
const loading = ref(true)
const refreshing = ref(false)
const analytics = ref<any>(null)

// Activity Feed Filtering & Search
const currentFilter = ref<'all' | 'view' | 'download' | 'session'>('all')
const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = 25

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'view', label: 'Views' },
  { key: 'download', label: 'Downloads' },
  { key: 'session', label: 'Sessions' },
]

// Session Table Sorting & Filtering
const sessionSearchQuery = ref('')
const sessionSortKey = ref('created_at_desc')
const sessionSortField = computed(() => {
  if (sessionSortKey.value.startsWith('created_at')) return 'created_at'
  if (sessionSortKey.value.startsWith('views')) return 'views'
  if (sessionSortKey.value.startsWith('unique_visitors')) return 'unique_visitors'
  if (sessionSortKey.value.startsWith('individual_downloads')) return 'individual_downloads'
  if (sessionSortKey.value.startsWith('zip_downloads')) return 'zip_downloads'
  if (sessionSortKey.value.startsWith('total_downloads')) return 'total_downloads'
  if (sessionSortKey.value.startsWith('id')) return 'id'
  return 'created_at'
})
const sessionSortOrder = computed<'asc' | 'desc'>(() => {
  return sessionSortKey.value.endsWith('_asc') ? 'asc' : 'desc'
})

const sessionCurrentPage = ref(1)
const sessionPageSize = 15

function toggleSessionSort(field: string) {
  if (sessionSortField.value === field) {
    sessionSortKey.value = `${field}_${sessionSortOrder.value === 'asc' ? 'desc' : 'asc'}`
  } else {
    sessionSortKey.value = `${field}_desc`
  }
}

const summary = computed(() => {
  return analytics.value?.summary || {
    totalSessions: 0,
    completedSessions: 0,
    totalPhotos: 0,
    totalViews: analytics.value?.totalVisits || 0,
    uniqueVisitors: analytics.value?.uniqueVisitors || 0,
    totalDownloads: 0,
    photoDownloads: 0,
    zipDownloads: 0,
    qrScans: 0,
    directVisits: 0,
    emailsSent: 0,
    emailsTotal: 0,
    avgSessionSpeedKbps: 0,
    totalDataBytes: 0
  }
})

const conversionRate = computed(() => {
  const views = summary.value.totalViews
  const unq = summary.value.uniqueVisitors
  if (!views || !unq) return 0
  return Math.min(100, Math.round((unq / views) * 100))
})

const qrPercentage = computed(() => {
  const qr = summary.value.qrScans || 0
  const direct = summary.value.directVisits || 0
  const total = qr + direct
  if (total === 0) return 50
  return Math.round((qr / total) * 100)
})

const devices = computed(() => analytics.value?.breakdowns?.devices || [])
const osList = computed(() => analytics.value?.breakdowns?.os || [])
const browsers = computed(() => analytics.value?.breakdowns?.browsers || [])
const topDownloads = computed(() => analytics.value?.topDownloads || [])

// Raw sessions list from analytics
const rawSessionsList = computed(() => {
  return analytics.value?.sessions || []
})

// Filtered and sorted sessions
const filteredSessions = computed(() => {
  let list = [...rawSessionsList.value]

  if (sessionSearchQuery.value.trim()) {
    const q = sessionSearchQuery.value.toLowerCase().trim()
    list = list.filter((s: any) => {
      return (
        s.id?.toLowerCase().includes(q) ||
        s.share_id?.toLowerCase().includes(q) ||
        s.share_title?.toLowerCase().includes(q)
      )
    })
  }

  const field = sessionSortField.value
  const order = sessionSortOrder.value

  list.sort((a: any, b: any) => {
    let valA = a[field] ?? 0
    let valB = b[field] ?? 0

    if (field === 'created_at' || field === 'id') {
      valA = String(valA)
      valB = String(valB)
      return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    }

    valA = Number(valA) || 0
    valB = Number(valB) || 0
    return order === 'asc' ? valA - valB : valB - valA
  })

  return list
})

const totalSessionPages = computed(() => {
  return Math.ceil(filteredSessions.value.length / sessionPageSize) || 1
})

const paginatedSessions = computed(() => {
  const start = (sessionCurrentPage.value - 1) * sessionPageSize
  return filteredSessions.value.slice(start, start + sessionPageSize)
})

// Per-session aggregated totals
const sessionTotals = computed(() => {
  const totals = {
    views: 0,
    unique_visitors: 0,
    individual_downloads: 0,
    zip_downloads: 0,
    total_downloads: 0
  }
  for (const s of filteredSessions.value) {
    totals.views += s.views || 0
    totals.unique_visitors += s.unique_visitors || 0
    totals.individual_downloads += s.individual_downloads || 0
    totals.zip_downloads += s.zip_downloads || 0
    totals.total_downloads += s.total_downloads || 0
  }
  return totals
})

const timelinePoints = computed(() => {
  return analytics.value?.timeline?.hourly || []
})

const maxTimelineValue = computed(() => {
  let max = 1
  for (const p of timelinePoints.value) {
    const sum = (p.sessions || 0) + (p.views || 0) + (p.downloads || 0)
    if (sum > max) max = sum
  }
  return max
})

function getBarHeight(val: number) {
  if (!val || val <= 0) return 0
  return Math.max(8, Math.round((val / maxTimelineValue.value) * 100))
}

const allActivityList = computed(() => {
  if (analytics.value?.activity && analytics.value.activity.length > 0) {
    return analytics.value.activity
  }
  if (analytics.value?.logs) {
    return analytics.value.logs.map((l: any) => ({
      id: l.id,
      type: l.action,
      title: l.action === 'download' ? 'Downloaded Photo' : 'Gallery View',
      created_at: l.created_at,
      source: l.source || 'direct',
      device: `${l.device_type || 'Desktop'} / ${l.os || 'OS'}`,
      browser: l.browser || '',
      target: l.target_file || '-',
      ip: l.ip_address || '-'
    }))
  }
  return []
})

const filteredActivity = computed(() => {
  let list = allActivityList.value

  if (currentFilter.value !== 'all') {
    list = list.filter((item: any) => item.type === currentFilter.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter((item: any) => {
      return (
        item.device?.toLowerCase().includes(q) ||
        item.target?.toLowerCase().includes(q) ||
        item.title?.toLowerCase().includes(q) ||
        item.ip?.toLowerCase().includes(q) ||
        item.source?.toLowerCase().includes(q)
      )
    })
  }

  return list
})

const totalPages = computed(() => {
  return Math.ceil(filteredActivity.value.length / pageSize) || 1
})

const paginatedActivity = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredActivity.value.slice(start, start + pageSize)
})

async function fetchData(isRefresh = false) {
  if (isRefresh) refreshing.value = true
  else loading.value = true

  try {
    const { data: eventData } = await axios.get(`/api/admin/events/${eventId.value}`)
    event.value = eventData.event

    const { data: analyticsData } = await axios.get(`/api/admin/events/${eventId.value}/analytics`)
    analytics.value = analyticsData
  } catch (err) {
    console.error('Failed to load analytics:', err)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function exportCSV() {
  const lines: string[] = []

  // Section 1: Session Performance
  lines.push('--- SESSION PERFORMANCE STATS ---')
  lines.push(['Session ID', 'Share Title', 'Created At', 'Status', 'Views', 'Unique Viewers', 'Individual Downloads', 'ZIP Downloads', 'Total Downloads'].join(','))
  for (const s of rawSessionsList.value) {
    lines.push([
      `"${s.id}"`,
      `"${(s.share_title || '').replace(/"/g, '""')}"`,
      `"${s.created_at || ''}"`,
      `"${s.upload_status || 'complete'}"`,
      s.views || 0,
      s.unique_visitors || 0,
      s.individual_downloads || 0,
      s.zip_downloads || 0,
      s.total_downloads || 0
    ].join(','))
  }

  lines.push('')
  lines.push('--- RECENT ACTIVITY LOGS ---')
  lines.push(['Time', 'Event Type', 'Source', 'Device', 'Target', 'IP Address'].join(','))
  for (const item of allActivityList.value) {
    lines.push([
      `"${item.created_at || ''}"`,
      `"${item.type || ''}"`,
      `"${item.source || ''}"`,
      `"${item.device || ''}"`,
      `"${item.target || ''}"`,
      `"${item.ip || ''}"`
    ].join(','))
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(lines.join('\n'))
  const link = document.createElement('a')
  link.setAttribute('href', csvContent)
  link.setAttribute('download', `${event.value?.name || 'event'}-analytics-${new Date().toISOString().substring(0, 10)}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function getActionBadgeClass(type: string) {
  switch (type) {
    case 'download': return 'badge-cyan'
    case 'view': return 'badge-purple'
    case 'session': return 'badge-green'
    case 'email': return 'badge-orange'
    default: return 'badge-gray'
  }
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIdx = 0
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024
    unitIdx++
  }
  return `${size.toFixed(1)} ${units[unitIdx]}`
}

function formatDate(str: string) {
  if (!str) return ''
  const d = new Date(str)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatHour(str: string) {
  if (!str) return ''
  const d = new Date(str.includes(' ') ? str.replace(' ', 'T') : str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatHourShort(str: string) {
  if (!str) return ''
  const d = new Date(str.includes(' ') ? str.replace(' ', 'T') : str)
  if (isNaN(d.getTime())) return str
  return d.toLocaleTimeString([], { hour: 'numeric' })
}

import { formatDateTime } from '@/utils/dateFormat'

function formatTime(str: string) {
  if (!str) return '-'
  return formatDateTime(str)
}

function formatSessionId(id: string) {
  if (!id) return '-'
  if (id.startsWith('session_')) {
    return 'Session #' + id.replace('session_', '').slice(-6)
  }
  return id.slice(0, 12)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.page-wrapper {
  background: var(--color-bg);
  min-height: 100vh;
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

.analytics-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  color: var(--color-text-sub);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-text);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.spin-anim {
  animation: spin 0.8s linear infinite;
}

/* Header & Controls */
.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.625rem;
  font-weight: 700;
  margin: 0 0 0.35rem 0;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-sub);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-pill {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  font-size: 0.7rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.status-active {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.status-completed, .status-ended {
  background: rgba(156, 163, 175, 0.15);
  color: #9ca3af;
}

.peak-badge {
  background: rgba(251, 191, 36, 0.15);
  color: #fcd34d;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  font-size: 0.75rem;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 0.625rem;
  align-items: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.btn-secondary {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-text-muted);
  background: var(--color-surface-alt);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: border-color var(--transition-fast);
}

.kpi-card:hover {
  border-color: var(--color-text-muted);
}

.kpi-icon {
  width: 42px;
  height: 42px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-green { background: rgba(34, 197, 94, 0.12); color: #4ade80; }
.icon-purple { background: rgba(168, 85, 247, 0.12); color: #c084fc; }
.icon-blue { background: rgba(59, 130, 246, 0.12); color: #60a5fa; }
.icon-cyan { background: rgba(6, 182, 212, 0.12); color: #22d3ee; }
.icon-orange { background: rgba(249, 115, 22, 0.12); color: #fb923c; }
.icon-yellow { background: rgba(234, 179, 8, 0.12); color: #facc15; }

.kpi-body {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-sub);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.kpi-value-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.kpi-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.1;
}

.kpi-tag {
  font-size: 0.7rem;
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.tag-green { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.tag-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
.tag-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
.tag-cyan { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
.tag-orange { background: rgba(249, 115, 22, 0.2); color: #fb923c; }

.kpi-subtext {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Base Card */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  margin-bottom: 1.75rem;
}

.card h2 {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-sub);
  margin: 0 0 0.25rem;
}

.section-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.25rem;
}

.section-title-wrap h2 {
  margin: 0;
}

.counter-pill {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-sub);
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  padding: 0.1rem 0.45rem;
  border-radius: var(--radius-pill);
}

.card-desc {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  margin: 0 0 1.25rem;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

/* Timeline Chart */
.chart-legend {
  display: flex;
  gap: 1rem;
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-sessions { background: #4ade80; }
.dot-views { background: #c084fc; }
.dot-downloads { background: #22d3ee; }

.chart-container {
  overflow-x: auto;
  padding: 1rem 0 0.5rem;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  height: 160px;
  min-width: 100%;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.chart-bar-group {
  flex: 1;
  min-width: 32px;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  position: relative;
}

.bar-stack {
  width: 16px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
}

.bar-segment {
  width: 100%;
  border-radius: 3px;
  margin-bottom: 2px;
  transition: height 0.3s ease;
}

.bar-sessions { background: #4ade80; }
.bar-views { background: #c084fc; }
.bar-downloads { background: #22d3ee; }

.bar-label {
  position: absolute;
  bottom: -1.4rem;
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Breakdowns */
.breakdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
}

.channel-bar-wrap {
  margin-bottom: 1.5rem;
}

.channel-bar-header {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-text-sub);
  margin-bottom: 0.5rem;
}

.channel-progress {
  height: 8px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-pill);
  overflow: hidden;
  display: flex;
}

.progress-qr { background: #c084fc; transition: width 0.3s; }
.progress-direct { background: #60a5fa; transition: width 0.3s; }

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.breakdown-subhead {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.05em;
}

.top-gap {
  margin-top: 0.75rem;
}

.breakdown-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.breakdown-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
}

.breakdown-name {
  color: var(--color-text);
  font-weight: 500;
}

.breakdown-stat {
  color: var(--color-text-sub);
}

.mini-bar-track {
  height: 6px;
  background: var(--color-surface-alt);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.mini-bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.fill-blue { background: #60a5fa; }
.fill-purple { background: #c084fc; }

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.browser-badge {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  padding: 0.3rem 0.6rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  color: var(--color-text);
}

.browser-badge strong {
  color: var(--color-info);
  margin-left: 0.25rem;
}

/* ============================================================
   Per-Session Stats Table Styles
   ============================================================ */
.session-stats-card {
  margin-bottom: 1.75rem;
}

.sort-select-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.filter-label {
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.filter-select {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-text-muted);
}

.session-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: var(--text-sm);
}

.session-table th {
  padding: 0.85rem 1.1rem;
  font-weight: 600;
  color: var(--color-text-sub);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  white-space: nowrap;
}

.sortable-th {
  cursor: pointer;
  user-select: none;
  transition: color var(--transition-fast);
}

.sortable-th:hover {
  color: var(--color-text);
}

.sort-indicator {
  display: inline-block;
  margin-left: 0.25rem;
  font-size: 0.65rem;
  color: var(--color-info);
}

.num-col {
  text-align: center;
}

.actions-col {
  text-align: right;
}

.session-table td {
  padding: 0.85rem 1.1rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-xs);
}

.session-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.session-main-cell {
  min-width: 200px;
}

.session-cell-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.session-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-sub);
  flex-shrink: 0;
}

.session-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.session-id-text {
  font-weight: 600;
  color: var(--color-text);
  font-size: var(--text-xs);
}

.session-time-text {
  font-size: 0.7rem;
  color: var(--color-text-sub);
}

.session-title-tag {
  font-size: 0.65rem;
  color: #c084fc;
  font-style: italic;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-badge {
  display: inline-block;
  font-weight: 600;
  font-size: 0.75rem;
  padding: 0.15rem 0.55rem;
  border-radius: var(--radius-pill);
}

.metric-purple {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.metric-blue {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.download-cell {
  color: var(--color-text-muted);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.download-cell.has-val {
  color: #22d3ee;
  font-weight: 600;
}

.inline-zip-icon {
  color: #60a5fa;
}

.total-downloads-text {
  color: var(--color-text-sub);
  font-size: 0.85rem;
}

.total-highlight {
  color: #22d3ee;
}

.action-buttons-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.action-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-sub);
  padding: 0.25rem 0.55rem;
  border-radius: var(--radius-sm);
  font-size: 0.7rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-pill-btn:hover {
  border-color: var(--color-text-muted);
  color: var(--color-text);
  background: var(--color-surface-alt);
}

.action-admin {
  color: var(--color-text-muted);
}

.table-totals-row {
  background: var(--color-surface);
  border-top: 2px solid var(--color-border);
  font-weight: 600;
}

.table-totals-row td {
  padding: 0.85rem 1.1rem;
  color: var(--color-text);
  font-size: var(--text-xs);
}

.total-label-cell {
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
}

/* Top Downloads */
.top-downloads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.download-item {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.download-file-icon {
  color: #22d3ee;
}

.download-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.download-name {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.download-badge {
  font-size: 0.7rem;
  color: var(--color-text-sub);
}

/* Activity Feed & Table */
.table-filters {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.15rem;
}

.filter-tab {
  background: none;
  border: none;
  color: var(--color-text-sub);
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.filter-tab.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

.search-input {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  min-width: 180px;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-text-muted);
}

.settings-box {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.logs-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: var(--text-sm);
}

.logs-table th {
  padding: 0.85rem 1.25rem;
  font-weight: 500;
  color: var(--color-text-sub);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.logs-table td {
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-xs);
}

.logs-table tbody tr:last-child td {
  border-bottom: none;
}

.logs-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.log-time, .log-device, .log-ip {
  color: var(--color-text-sub) !important;
}

.log-target {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--color-text);
}

/* Badges */
.badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  border-radius: var(--radius-pill);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.badge-green { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
.badge-purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.badge-cyan { background: rgba(6, 182, 212, 0.15); color: #22d3ee; }
.badge-orange { background: rgba(249, 115, 22, 0.15); color: #fb923c; }
.badge-yellow { background: rgba(234, 179, 8, 0.15); color: #facc15; }
.badge-gray { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }

/* Pagination */
.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: var(--text-xs);
  color: var(--color-text-sub);
}

.page-btns {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-btn {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  padding: 0.25rem 0.6rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  cursor: pointer;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-current {
  color: var(--color-text);
  font-weight: 500;
}

.app-empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-sub);
}

.muted-note {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
  font-style: italic;
}

@media (max-width: 900px) {
  .breakdown-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  .settings-box {
    overflow-x: auto;
  }

  /* Responsive session table */
  .session-table thead, .logs-table thead {
    display: none;
  }
  .session-table, .session-table tbody, .session-table tr, .session-table td,
  .logs-table, .logs-table tbody, .logs-table tr, .logs-table td {
    display: block;
    width: 100%;
  }
  .session-table tr, .logs-table tr {
    border-bottom: 1px solid var(--color-border);
    padding: 0.75rem 0;
  }
  .session-table td, .logs-table td {
    border: none;
    padding: 0.35rem 1.25rem;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .session-table td::before, .logs-table td::before {
    content: attr(data-label);
    font-size: 0.75rem;
    color: var(--color-text-sub);
    text-transform: uppercase;
  }
  .num-col, .actions-col {
    text-align: left;
  }
}
</style>