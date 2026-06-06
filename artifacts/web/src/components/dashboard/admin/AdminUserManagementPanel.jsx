import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Users, MoreHorizontal, Search, ShieldCheck, Ban, CheckCircle2, Coins, Loader2, Pencil, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import adminApi from '@/lib/adminApi.js';
import { useAdminData } from '@/contexts/AdminDataContext.jsx';
import { num, compact, usd } from '@/lib/adminFormat.js';

const ROLE_OPTIONS = ['USER', 'ADMIN', 'SUPER_ADMIN'];
const TIER_OPTIONS = ['free', 'starter', 'builder', 'operator', 'empire'];
const STATUS_OPTIONS = ['inactive', 'active', 'cancelled'];
const NO_TIER = '__none__';

const AdminUserManagementPanel = () => {
  const { reloadAnalytics } = useAdminData();
  const [, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [usageMap, setUsageMap] = useState({});

  const [creditUser, setCreditUser] = useState(null);
  const [creditDelta, setCreditDelta] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditSaving, setCreditSaving] = useState(false);

  const [editUser, setEditUser] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMembershipTier, setEditMembershipTier] = useState('');
  const [editMembershipStatus, setEditMembershipStatus] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, perPage };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      setData(await adminApi.listUsers(params));
    } catch (e) {
      setError(e.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const loadUsage = useCallback(async () => {
    try {
      const rows = await adminApi.getUsageByUser(200);
      const map = {};
      (rows ?? []).forEach((r) => { map[r.userId] = r; });
      setUsageMap(map);
    } catch {
      setUsageMap({});
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    setBusyId(user.id);
    try {
      await adminApi.updateUser(user.id, { role });
      toast.success(`Role updated to ${role}`);
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  };

  const toggleSuspend = async (user) => {
    setBusyId(user.id);
    try {
      await adminApi.updateUser(user.id, { active: !user.active });
      toast.success(user.active ? 'User suspended' : 'User reactivated');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to update user');
    } finally {
      setBusyId(null);
    }
  };

  const openEditDialog = (user) => {
    setEditUser(user);
    setEditName(user.name || '');
    setEditMembershipTier(user.membershipTier || NO_TIER);
    setEditMembershipStatus(user.membershipStatus || 'inactive');
  };

  const submitEdit = async () => {
    setEditSaving(true);
    try {
      const body = {};
      if (editName.trim() !== (editUser.name || '')) body.name = editName.trim() || null;
      const tierVal = editMembershipTier === NO_TIER ? null : editMembershipTier;
      if (tierVal !== (editUser.membershipTier ?? null)) body.membershipTier = tierVal;
      if (editMembershipStatus !== (editUser.membershipStatus || '')) body.membershipStatus = editMembershipStatus || null;
      if (Object.keys(body).length === 0) { toast.info('No changes to save.'); setEditUser(null); return; }
      await adminApi.updateUser(editUser.id, body);
      toast.success('User details updated.');
      setEditUser(null);
      load();
      reloadAnalytics();
    } catch (e) {
      toast.error(e.message || 'Failed to update user');
    } finally {
      setEditSaving(false);
    }
  };

  const submitCredits = async () => {
    const delta = parseInt(creditDelta, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error('Enter a non-zero credit amount');
      return;
    }
    setCreditSaving(true);
    try {
      const res = await adminApi.adjustCredits(creditUser.id, {
        delta,
        reason: creditReason.trim() || undefined,
      });
      toast.success(`Credits adjusted. New balance: ${num(res.balance)}`);
      setCreditUser(null);
      setCreditDelta('');
      setCreditReason('');
      load();
      reloadAnalytics();
    } catch (e) {
      toast.error(e.message || 'Failed to adjust credits');
    } finally {
      setCreditSaving(false);
    }
  };

  const viewRevenue = (user) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('revenueUserId', String(user.id));
      next.delete('revenueSystemId');
      return next;
    }, { replace: true });
    setTimeout(() => {
      document.getElementById('admin-revenue-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const users = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <Card className="shadow-sm border-border/50 col-span-full xl:col-span-2">
      <CardHeader className="pb-3 border-b border-border/30 bg-muted/5">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> User Management
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">{num(total)} users</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search email or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error ? (
          <p className="text-sm text-destructive p-4">{error}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/10">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">AI Usage</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground italic py-8">
                    No users match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => viewRevenue(user)}
                        className="text-left group"
                        title="View revenue for this user"
                      >
                        <div className="font-medium text-sm group-hover:text-emerald-400 transition-colors">{user.name || '—'}</div>
                        <div className="text-xs text-muted-foreground group-hover:text-emerald-500/70 transition-colors">{user.email}</div>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? 'bg-primary/10 text-primary' : 'bg-muted'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.active ? (
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-medium">Active</span>
                      ) : (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded font-medium">Suspended</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {usageMap[user.id] ? (
                        <div className="leading-tight">
                          <div>{compact(usageMap[user.id].requests)} req · {compact(usageMap[user.id].tokens)} tok</div>
                          <div className="text-muted-foreground">{usd(usageMap[user.id].costUsd)}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{num(user.creditsBalance)}</TableCell>
                    <TableCell className="text-right">
                      {busyId === user.id ? (
                        <Loader2 className="w-4 h-4 animate-spin inline-block text-muted-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                            {ROLE_OPTIONS.map((r) => (
                              <DropdownMenuItem key={r} disabled={r === user.role} onClick={() => changeRole(user, r)}>
                                <ShieldCheck className="w-4 h-4 mr-2" /> {r}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => viewRevenue(user)}>
                              <TrendingUp className="w-4 h-4 mr-2" /> View Revenue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(user)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setCreditUser(user); setCreditDelta(''); setCreditReason(''); }}>
                              <Coins className="w-4 h-4 mr-2" /> Adjust Credits
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleSuspend(user)} className={user.active ? 'text-destructive' : 'text-emerald-600'}>
                              {user.active ? <><Ban className="w-4 h-4 mr-2" /> Suspend</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Reactivate</>}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!creditUser} onOpenChange={(open) => !open && setCreditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credits</DialogTitle>
            <DialogDescription>
              {creditUser ? `${creditUser.email} · current balance ${num(creditUser.creditsBalance)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (use negative to deduct)</label>
              <Input
                type="number"
                placeholder="e.g. 100 or -50"
                value={creditDelta}
                onChange={(e) => setCreditDelta(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason (optional)</label>
              <Input
                placeholder="e.g. Promotional grant"
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditUser(null)} disabled={creditSaving}>Cancel</Button>
            <Button onClick={submitCredits} disabled={creditSaving}>
              {creditSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Details</DialogTitle>
            <DialogDescription>
              {editUser ? `${editUser.email}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Display Name</label>
              <Input
                placeholder="e.g. Jane Smith"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Membership Tier</label>
              <Select value={editMembershipTier} onValueChange={setEditMembershipTier}>
                <SelectTrigger><SelectValue placeholder="No tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TIER}>No Tier</SelectItem>
                  {TIER_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Membership Status</label>
              <Select value={editMembershipStatus} onValueChange={setEditMembershipStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={editSaving}>Cancel</Button>
            <Button onClick={submitEdit} disabled={editSaving}>
              {editSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminUserManagementPanel;
