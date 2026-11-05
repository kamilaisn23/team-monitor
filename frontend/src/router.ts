import { createRouter, createWebHistory } from "vue-router";
import { bootstrap, loadWorkspace, workspace, notify, effectiveRole, isAdmin, isRealAdmin } from "./state";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: "/",
      component: () => import("./pages/Landing.vue"),
      meta: { public: true, landing: true },
    },
    {
      path: "/preview",
      component: () => import("./pages/WorkspacePage.vue"),
      meta: { preview: true },
    },
    { path: "/dashboard", component: () => import("./pages/Dashboard.vue") },
    { path: "/reports", component: () => import("./pages/Reports.vue") },
    {
      path: "/admin/members",
      component: () => import("./pages/Members.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/members/new",
      component: () => import("./pages/MemberEditor.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/members/:id/edit",
      component: () => import("./pages/MemberEditor.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/teams",
      component: () => import("./pages/Teams.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/repositories",
      component: () => import("./pages/Repositories.vue"),
      meta: { admin: true },
    },
    {
      path: "/admin/settings",
      component: () => import("./pages/Settings.vue"),
      meta: { admin: true, superadmin: true },
    },
    {
      path: "/members/:id",
      component: () => import("./pages/MemberProfile.vue"),
    },
    {
      path: "/login",
      component: () => import("./pages/Login.vue"),
      meta: { public: true },
    },
    { path: "/pending", component: () => import("./pages/Pending.vue") },
    {
      path: "/:pathMatch(.*)*",
      component: () => import("./pages/NotFound.vue"),
      meta: { public: true },
    },
  ],
});
router.beforeEach(async (to, from) => {
  if (to.meta.preview) {
    if (!workspace.preview || !workspace.teams.length)
      await loadWorkspace(true);
    return true;
  }
  try {
    await bootstrap();
  } catch {
    if (!to.meta.public) return "/login?error=Connection";
  }
  if (to.meta.public)
    return (to.path === "/login" || to.meta.landing) && workspace.session
      ? "/dashboard"
      : true;
  if (!workspace.session) return "/login";
  const user = workspace.session.user;
  if (!isRealAdmin.value && effectiveRole.value === "DEVELOPER" && to.path.startsWith("/members/") && to.params.id !== user.id)
    return user.id ? "/members/" + user.id : "/dashboard";
  if (effectiveRole.value === "UNASSIGNED" && to.path !== "/pending")
    return "/pending";
  if ((to.meta.admin || to.meta.superadmin) && !isAdmin.value)
    return "/dashboard";
  if (
    !to.meta.public &&
    to.path !== "/pending" &&
    (workspace.preview || from.meta.public || !workspace.teams.length)
  )
    try {
      await loadWorkspace(false);
    } catch (error) {
      notify((error as Error).message, "error");
    }
  return true;
});
router.afterEach((to) => {
  const title =
    to.path === "/login"
      ? "Masuk"
      : to.meta.landing
        ? "Beranda"
        : "Workspace";
  document.title = `${title} · Team Monitor`;
});
export function sectionHref(section: string) {
  return workspace.preview
    ? `/preview${section === "dashboard" ? "" : "?section=" + section}`
    : section === "dashboard" || section === "reports"
      ? "/" + section
      : "/admin/" + section;
}
export default router;
