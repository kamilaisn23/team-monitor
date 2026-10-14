import { createRouter, createWebHistory } from "vue-router";
import { bootstrap, loadWorkspace, workspace, notify } from "./state";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", redirect: "/dashboard" },
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
    return to.path === "/login" && workspace.session ? "/dashboard" : true;
  if (!workspace.session) return "/login";
  const user = workspace.session.user;
  if (!user.isSuperadmin && user.role === 'DEVELOPER' && to.path.startsWith('/members/') && to.params.id !== user.id)
    return user.id ? '/members/' + user.id : '/dashboard';
  if (
    user.role === "UNASSIGNED" &&
    !user.isSuperadmin &&
    to.path !== "/pending"
  )
    return "/pending";
  if (
    (to.meta.admin &&
      !user.isSuperadmin &&
      !["ADMIN", "SUPERADMIN"].includes(user.role)) ||
    (to.meta.superadmin && !user.isSuperadmin)
  )
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
  document.title = `${to.path === "/login" ? "Masuk" : "Workspace"} — Team Monitor`;
});
export function sectionHref(section: string) {
  return workspace.preview
    ? `/preview${section === "dashboard" ? "" : "?section=" + section}`
    : section === "dashboard" || section === "reports"
      ? "/" + section
      : "/admin/" + section;
}
export default router;
