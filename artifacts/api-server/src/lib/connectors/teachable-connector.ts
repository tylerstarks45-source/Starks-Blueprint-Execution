import { BaseConnector, TestResult, ExecResult } from "./base";

// Teachable REST API connector.
// Required credentials:
//   TEACHABLE_API_KEY  — API key from teachable.com/users/edit (API section)

const BASE = "https://developers.teachable.com/v1";

export class TeachableConnector extends BaseConnector {
  readonly id = "teachable";
  readonly displayName = "Teachable";
  readonly category = "courses";
  readonly authType = "api_key" as const;
  readonly requiredCredentials = ["TEACHABLE_API_KEY"];
  readonly actions = ["listCourses", "getCourse", "listStudents", "enrollStudent", "getCourseRevenue", "listCoupons"];

  private headers() {
    return {
      apiKey: this.creds["TEACHABLE_API_KEY"],
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  async testConnection(): Promise<TestResult> {
    if (!this.creds["TEACHABLE_API_KEY"]) {
      return { ok: false, latencyMs: 0, message: "TEACHABLE_API_KEY required" };
    }
    const start = Date.now();
    try {
      const res = await fetch(`${BASE}/courses`, { headers: this.headers() });
      const latencyMs = Date.now() - start;
      if (res.ok) {
        const data = await res.json() as { courses?: unknown[]; meta?: { total?: number } };
        return { ok: true, latencyMs, message: `Connected — ${data.meta?.total ?? data.courses?.length ?? 0} course(s) found` };
      }
      return { ok: false, latencyMs, message: `Teachable returned ${res.status}` };
    } catch (err: unknown) {
      return { ok: false, latencyMs: Date.now() - start, message: String(err) };
    }
  }

  async execute(action: string, params: Record<string, unknown>): Promise<ExecResult> {
    const key = this.creds["TEACHABLE_API_KEY"];
    if (!key) return { ok: false, error: "TEACHABLE_API_KEY required" };

    try {
      if (action === "listCourses") {
        const res = await fetch(`${BASE}/courses`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Teachable ${res.status}` };
        const data = await res.json() as { courses?: Array<{ id?: number; name?: string; heading?: string; is_published?: boolean; price?: number }>; meta?: { total?: number } };
        return { ok: true, data: { total: data.meta?.total, courses: data.courses?.slice(0, 10).map(c => ({ id: c.id, name: c.name, published: c.is_published, price: c.price })), message: `Found ${data.meta?.total ?? data.courses?.length ?? 0} courses` } };
      }

      if (action === "getCourse") {
        const courseId = params["courseId"] as string;
        if (!courseId) return { ok: false, error: "courseId required" };
        const res = await fetch(`${BASE}/courses/${courseId}`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Teachable ${res.status}` };
        const data = await res.json() as { course?: { id?: number; name?: string; heading?: string; is_published?: boolean; price?: number; number_of_students?: number } };
        const c = data.course;
        return { ok: true, data: { id: c?.id, name: c?.name, published: c?.is_published, price: c?.price, students: c?.number_of_students, message: `Course "${c?.name}": ${c?.number_of_students ?? 0} students, $${(c?.price ?? 0) / 100}` } };
      }

      if (action === "listStudents") {
        const courseId = params["courseId"] as string;
        if (!courseId) return { ok: false, error: "courseId required" };
        const res = await fetch(`${BASE}/courses/${courseId}/enrollments?page_size=20`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Teachable ${res.status}` };
        const data = await res.json() as { enrollments?: Array<{ user?: { name?: string; email?: string }; enrolled_at?: string }>; meta?: { total?: number } };
        return { ok: true, data: { total: data.meta?.total, enrollments: data.enrollments?.slice(0, 5).map(e => ({ name: e.user?.name, email: e.user?.email, enrolledAt: e.enrolled_at })), message: `${data.meta?.total ?? 0} students enrolled in course ${courseId}` } };
      }

      if (action === "enrollStudent") {
        const courseId = params["courseId"] as string;
        const email = params["email"] as string;
        if (!courseId || !email) return { ok: false, error: "courseId and email required" };
        const res = await fetch(`${BASE}/courses/${courseId}/enrollments`, {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({ email }),
        });
        if (!res.ok) { const e = await res.text(); return { ok: false, error: `Teachable ${res.status}: ${e.slice(0, 200)}` }; }
        const data = await res.json() as { enrollment?: { id?: number; user?: { email?: string } } };
        return { ok: true, data: { id: data.enrollment?.id, email: data.enrollment?.user?.email, message: `Student ${email} enrolled in course ${courseId}` } };
      }

      if (action === "getCourseRevenue") {
        const courseId = params["courseId"] as string;
        if (!courseId) return { ok: false, error: "courseId required" };
        const res = await fetch(`${BASE}/courses/${courseId}/revenue`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Teachable ${res.status}` };
        const data = await res.json() as { revenue?: { total_cents?: number; currency?: string } };
        const total = data.revenue?.total_cents ?? 0;
        return { ok: true, data: { totalCents: total, totalDollars: (total / 100).toFixed(2), currency: data.revenue?.currency, message: `Course ${courseId} revenue: $${(total / 100).toFixed(2)} ${data.revenue?.currency ?? ""}` } };
      }

      if (action === "listCoupons") {
        const courseId = params["courseId"] as string;
        if (!courseId) return { ok: false, error: "courseId required" };
        const res = await fetch(`${BASE}/courses/${courseId}/coupons`, { headers: this.headers() });
        if (!res.ok) return { ok: false, error: `Teachable ${res.status}` };
        const data = await res.json() as { coupons?: Array<{ id?: number; code?: string; discount_type?: string; amount_off?: number; times_used?: number }> };
        return { ok: true, data: { count: data.coupons?.length, coupons: data.coupons?.slice(0, 10).map(c => ({ code: c.code, discount: c.discount_type, amount: c.amount_off, used: c.times_used })), message: `Found ${data.coupons?.length ?? 0} coupon(s) for course ${courseId}` } };
      }

      return { ok: false, error: `Unknown Teachable action: ${action}. Available: listCourses, getCourse, listStudents, enrollStudent, getCourseRevenue, listCoupons` };
    } catch (err: unknown) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
