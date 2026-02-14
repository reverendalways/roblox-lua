"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StaffManagement from "../../components/StaffManagement";

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const SIDEBAR_ITEMS = [

	{ key: "updateMultipliers", label: "Update Multipliers", rank: "junior_moderator" },
	{ key: "promo", label: "Promo Code Generator", rank: "owner" },
	{ key: "codes", label: "Codes", rank: "owner" },
	{ key: "delete", label: "Delete Script", rank: "junior_moderator" },
	{ key: "deleteAccount", label: "Delete Account", rank: "junior_moderator" },
	{ key: "deleteComment", label: "Delete Comment", rank: "junior_moderator" },
	{ key: "suspendAccount", label: "Timeout Management", rank: "junior_moderator" },
	{ key: "staffManagement", label: "Staff Management", rank: "junior_moderator" },
	{ key: "verifyAccount", label: "Verify Account", rank: "senior_moderator" },
	{ key: "dashboardShutdown", label: "Dashboard Shutdown", rank: "senior_moderator" },

];

const RANK_HIERARCHY = {
	'junior_moderator': 1,
	'moderator': 2,
	'senior_moderator': 3,
	'owner': 4
};

export default function AdminDashboard() {
	const [loading, setLoading] = useState(true);
	const [allowed, setAllowed] = useState(false);
	const [initialAuthLoading, setInitialAuthLoading] = useState(false);
	const [token1, setToken1] = useState("");
	const [token2, setToken2] = useState("");
	const [token1Display, setToken1Display] = useState("");
	const [token2Display, setToken2Display] = useState("");
	const [token1Masked, setToken1Masked] = useState("");
	const [token2Masked, setToken2Masked] = useState("");

	const [error, setError] = useState("");
	const [amount, setAmount] = useState(10);
	const [codesByTier, setCodesByTier] = useState<{ [tier: string]: string[] }>({});
	const [genLoading, setGenLoading] = useState(false);
	const [genError, setGenError] = useState("");
	const [genSuccess, setGenSuccess] = useState("");
	const [isAuthed, setIsAuthed] = useState(false);
	const [section, setSection] = useState<'updateMultipliers'|'promo'|'codes'|'delete'|'deleteAccount'|'deleteComment'|'staffManagement'|'suspendAccount'|'verifyAccount'|'dashboardShutdown'>("updateMultipliers");

	const [deleteId, setDeleteId] = useState("");
	const [deleteLoading, setDeleteLoading] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const [deleteSuccess, setDeleteSuccess] = useState("");
	const [deleteUsername, setDeleteUsername] = useState("");
	const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
	const [deleteAccountError, setDeleteAccountError] = useState("");
	const [deleteAccountSuccess, setDeleteAccountSuccess] = useState("");

	const [deleteCommentId, setDeleteCommentId] = useState("");
	const [deleteCommentLoading, setDeleteCommentLoading] = useState(false);
	const [deleteCommentError, setDeleteCommentError] = useState("");
	const [deleteCommentSuccess, setDeleteCommentSuccess] = useState("");
	const [updateMultipliersLoading, setUpdateMultipliersLoading] = useState(false);
	const [updateMultipliersError, setUpdateMultipliersError] = useState("");
	const [updateMultipliersSuccess, setUpdateMultipliersSuccess] = useState("");
	const [currentUserPermissions, setCurrentUserPermissions] = useState<any>(null);
	const [permissionsLoading, setPermissionsLoading] = useState(false);
	const [currentUserInfo, setCurrentUserInfo] = useState<any>(null);
	const [codesLoading, setCodesLoading] = useState(false);
	const [promoCodesByTier, setPromoCodesByTier] = useState<{ [tier: string]: { code: string; codeType: string; description: string; active: boolean; usedAt: string; tier: string }[] }>({});
	const [ageResetCodes, setAgeResetCodes] = useState<{ code: string; codeType: string; description: string; active: boolean; usedAt: string; tier: string }[]>([]);
	const [codesError, setCodesError] = useState("");
	const [codeType, setCodeType] = useState("promo");
	const [codeTypeFilter, setCodeTypeFilter] = useState<'promo' | 'ageReset'>('promo');
	const [codeStats, setCodeStats] = useState<any>(null);
	const [dashboardStatus, setDashboardStatus] = useState<string>("true");
	const [dashboardShutdownLoading, setDashboardShutdownLoading] = useState(false);
	const [dashboardShutdownError, setDashboardShutdownError] = useState("");
	const [dashboardShutdownSuccess, setDashboardShutdownSuccess] = useState("");
	const [timeoutUsername, setTimeoutUsername] = useState("");
	const [timeoutDuration, setTimeoutDuration] = useState(60);
	const [timeoutDurationUnit, setTimeoutDurationUnit] = useState<'minutes' | 'hours' | 'days' | 'months'>('minutes');
	const [timeoutAction, setTimeoutAction] = useState<'timeout' | 'untimeout'>('timeout');
	const [timeoutReason, setTimeoutReason] = useState("");
	const [timeoutLoading, setTimeoutLoading] = useState(false);
	const [timeoutError, setTimeoutError] = useState("");
	const [timeoutSuccess, setTimeoutSuccess] = useState("");
	const [timeoutStats, setTimeoutStats] = useState<any>(null);
	const [timeoutStatsLoading, setTimeoutStatsLoading] = useState(false);
	const [untimeoutExpiredLoading, setUntimeoutExpiredLoading] = useState(false);
	const [untimeoutExpiredSuccess, setUntimeoutExpiredSuccess] = useState("");
	const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const [verifyUsername, setVerifyUsername] = useState("");
	const [verifyLoading, setVerifyLoading] = useState(false);
	const [verifyError, setVerifyError] = useState("");
	const [verifySuccess, setVerifySuccess] = useState("");
	const [verifyAction, setVerifyAction] = useState<'verify' | 'unverify'>('verify');
	const router = useRouter();

	const fetchExistingCodes = async () => {
		setCodesLoading(true);
		setCodesError("");
		try {
					const res = await fetch(`/api/admin/promo-codes`, {
						method: "GET",
						headers: {
							"x-admin-token1": token1,
							"x-admin-token2": token2
						}
					});

			if (res.ok) {
				const data = await res.json();
				setPromoCodesByTier(data.promoCodesByTier || {});
				setAgeResetCodes(data.ageResetCodes || []);
				setCodeStats(data.codeStats || null);
			} else {
				setCodesError("Failed to fetch existing codes");
			}
		} catch (error) {
			setCodesError("Failed to fetch existing codes");
		} finally {
			setCodesLoading(false);
		}
	};

	const cleanupOldCodes = async () => {
		setCodesLoading(true);
		try {
			const res = await fetch("/api/admin/promo-codes/cleanup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-token1": token1,
					"x-admin-token2": token2
				},
				body: JSON.stringify({})
			});

			if (res.ok) {
				await fetchExistingCodes();
			} else {
				setCodesError("Failed to cleanup old codes");
			}
		} catch (error) {
			setCodesError("Failed to cleanup old codes");
		} finally {
			setCodesLoading(false);
		}
	};

	const checkDashboardStatus = async () => {
		try {
			const res = await fetch(`/api/admin/dashboard-shutdown`, {
				headers: {
					"x-admin-token1": token1,
					"x-admin-token2": token2
				}
			});
			if (res.ok) {
				const data = await res.json();
				setDashboardStatus(data.dash);
			}
		} catch (error) {
		}
	};

	const fetchTimeoutStats = async () => {
		setTimeoutStatsLoading(true);
		try {
			const res = await fetch(`/api/admin/untimeout-expired`, {
				headers: {
					"x-admin-token1": token1,
					"x-admin-token2": token2
				}
			});
			if (res.ok) {
				const data = await res.json();
				setTimeoutStats(data);
			}
		} catch (error) {
		} finally {
			setTimeoutStatsLoading(false);
		}
	};

	const handleTimeoutUser = async (e: React.FormEvent) => {
		e.preventDefault();
		setTimeoutLoading(true);
		setTimeoutError("");
		setTimeoutSuccess("");

		try {
			const res = await fetch("/api/admin/timeout-user", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-token1": token1,
					"x-admin-token2": token2
				},
				body: JSON.stringify({
					username: timeoutUsername,
					action: timeoutAction,
					duration: timeoutAction === 'timeout' ? timeoutDuration : undefined,
					durationUnit: timeoutAction === 'timeout' ? timeoutDurationUnit : undefined,
					reason: timeoutAction === 'timeout' ? timeoutReason : undefined
				})
			});

			if (res.ok) {
				const data = await res.json();
				setTimeoutSuccess(data.message);
				setTimeoutUsername("");
				setTimeoutReason("");
				if (timeoutAction === 'timeout') {
					setTimeoutDuration(60);
					setTimeoutDurationUnit('minutes');
				}
				await fetchTimeoutStats();
			} else {
				const errorData = await res.json();
				setTimeoutError(errorData.error || "Failed to process timeout action");
			}
		} catch (error) {
			setTimeoutError("Failed to process timeout action");
		} finally {
			setTimeoutLoading(false);
		}
	};

	const handleUntimeoutExpired = async () => {
		setUntimeoutExpiredLoading(true);
		setUntimeoutExpiredSuccess("");

		try {
			const res = await fetch("/api/admin/untimeout-expired", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-token1": token1,
					"x-admin-token2": token2
				},
				body: JSON.stringify({})
			});

			if (res.ok) {
				const data = await res.json();
				setUntimeoutExpiredSuccess(data.message);
				await fetchTimeoutStats();
			}
		} catch (error) {
		} finally {
			setUntimeoutExpiredLoading(false);
		}
	};

	const handleVerifyAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		setVerifyLoading(true);
		setVerifyError("");
		setVerifySuccess("");

		try {
			const res = await fetch("/api/admin/verify-account", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-admin-token1": token1,
					"x-admin-token2": token2
				},
				body: JSON.stringify({
					username: verifyUsername,
					action: verifyAction
				})
			});

			if (res.ok) {
				const data = await res.json();
				setVerifySuccess(data.message);
				setVerifyUsername("");
				setVerifyAction('verify');
			} else {
				const errorData = await res.json();
				setVerifyError(errorData.error || "Failed to process verification action");
			}
		} catch (error) {
			setVerifyError("Failed to process verification action");
		} finally {
			setVerifyLoading(false);
		}
	};

	useEffect(() => {
		fetch("/api/admin/check-status", { credentials: "include" })
			.then(async (res) => {
				if (!res.ok) {
					router.replace("/home");
					return;
				}
				const data = await res.json();
				if (!data.isAdmin) {
					router.replace("/home");
					return;
				}
				setAllowed(true);
			})
			.catch(() => router.replace("/home"))
			.finally(() => setLoading(false));
	}, [router]);

	useEffect(() => {
		checkDashboardStatus();
	}, []);

	useEffect(() => {

	}, [isAuthed, section]);

	useEffect(() => {
		if (isAuthed && section === 'codes') {
			fetchExistingCodes();
		}
	}, [isAuthed, section]);

	useEffect(() => {
		if (isAuthed && section === 'dashboardShutdown') {
			checkDashboardStatus();
		}
	}, [isAuthed, section]);

	useEffect(() => {
		if (isAuthed && section === 'suspendAccount') {
			fetchTimeoutStats();
		}
	}, [isAuthed, section]);

	useEffect(() => {
		setCodesByTier({});
		setGenSuccess("");
		setGenError("");
	}, [codeType]);

	useEffect(() => {
		return () => {
			setToken1("");
			setToken2("");
			setToken1Display("");
			setToken2Display("");
			setToken1Masked("");
			setToken2Masked("");
		};
	}, []);

	useEffect(() => {
		setToken1Masked('*'.repeat(token1.length));
	}, [token1]);

	useEffect(() => {
		setToken2Masked('*'.repeat(token2.length));
	}, [token2]);

	useEffect(() => {
		if (!isAuthed) return;

		let inactivityTimer: NodeJS.Timeout;
		let warningTimer: NodeJS.Timeout;

		const resetTimer = () => {
			clearTimeout(inactivityTimer);
			clearTimeout(warningTimer);
			setSessionTimeoutWarning(false);

			warningTimer = setTimeout(() => {
				setSessionTimeoutWarning(true);
			}, 25 * 60 * 1000);

			inactivityTimer = setTimeout(() => {
				handleLogout();
			}, 30 * 60 * 1000);
		};

		const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
		events.forEach(event => {
			document.addEventListener(event, resetTimer, true);
		});

		resetTimer();

		return () => {
			clearTimeout(inactivityTimer);
			clearTimeout(warningTimer);
			events.forEach(event => {
				document.removeEventListener(event, resetTimer, true);
			});
		};
	}, [isAuthed]);

	useEffect(() => {
		if (currentUserPermissions && section && !canAccessSection(section)) {
			setSection('updateMultipliers');
		}
	}, [currentUserPermissions, section]);

	const getFilteredSidebarItems = () => {
		if (!currentUserPermissions) {
			return [];
		}

		const filteredItems = SIDEBAR_ITEMS.filter(item => {
			if (!item.rank) return false;
			const hasPermission = currentUserPermissions[item.rank] === true;
			return hasPermission;
		});
		return filteredItems;
	};

	const canAccessSection = (sectionKey: string) => {
		if (!currentUserPermissions) {
			return false;
		}

		const sectionItem = SIDEBAR_ITEMS.find(item => item.key === sectionKey);
		if (!sectionItem || !sectionItem.rank) {
			return false;
		}

		if (sectionKey === 'staffManagement') {
			const hasBasicAccess = currentUserPermissions[sectionItem.rank] === true;
			return hasBasicAccess;
		}

		const hasPermission = currentUserPermissions[sectionItem.rank] === true;
		return hasPermission;
	};

	const canEditStaff = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.owner === true;
	};

	const canDeleteVerifiedScripts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.moderator === true ||
			   currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const canDeleteOldScripts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.moderator === true ||
			   currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const canDeletePromotedScripts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const canDeleteNewAccounts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.junior_moderator === true;
	};

	const canDeleteUnverifiedAccounts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.moderator === true ||
			   currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const canDeleteAllAccounts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const canDeleteStaffAccounts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.owner === true;
	};

	const canTimeoutVerifiedAccounts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.moderator === true ||
			   currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const canTimeoutStaffAccounts = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.owner === true;
	};

	const canShutdownDashboard = () => {
		if (!currentUserPermissions) return false;
		return currentUserPermissions.senior_moderator === true ||
			   currentUserPermissions.owner === true;
	};

	const handleLogout = () => {
		setToken1("");
		setToken2("");
		setToken1Display("");
		setToken2Display("");
		setToken1Masked("");
		setToken2Masked("");

		setIsAuthed(false);
		setCurrentUserPermissions(null);
		setSection("updateMultipliers");
		setCodesByTier({});
		setPromoCodesByTier({});
		setAgeResetCodes([]);
		setCodeStats(null);

		setError("");
		setGenSuccess("");
		setGenError("");
		setDeleteSuccess("");
		setDeleteError("");
		setDeleteAccountSuccess("");
		setDeleteAccountError("");
		setDeleteCommentSuccess("");
		setDeleteCommentError("");
		setUpdateMultipliersSuccess("");
		setUpdateMultipliersError("");
		setDashboardShutdownSuccess("");
		setDashboardShutdownError("");
		setTimeoutSuccess("");
		setTimeoutError("");
		setUntimeoutExpiredSuccess("");
		setSessionTimeoutWarning(false);
	};

	const extendSession = () => {
		setSessionTimeoutWarning(false);
		document.dispatchEvent(new Event('mousemove'));
	};

	const handleTokenLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		const res = await fetch("/api/admin/secure-action", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({ action: "login" })
		});
		if (!res.ok) {
			setError("Invalid tokens or not allowed.");
			return;
		}

		setPermissionsLoading(true);
		try {
			const staffRes = await fetch(`/api/admin/staff/list`, {
				headers: {
					"x-admin-token1": token1,
					"x-admin-token2": token2
				}
			});

			if (staffRes.ok) {
				const staffData = await staffRes.json();

				if (staffData.currentUser && staffData.currentUser.staffPermissions) {
					setCurrentUserPermissions(staffData.currentUser.staffPermissions);
				} else if (staffData.currentUser && (staffData.currentUser.canManageStaff || staffData.currentUser.staffRank === 'owner')) {
					setCurrentUserPermissions({
						junior_moderator: true,
						moderator: true,
						senior_moderator: true,
						owner: true
					});
				} else {
					setCurrentUserPermissions({
						junior_moderator: true,
						moderator: true,
						senior_moderator: false,
						owner: false
					});
				}
			} else {
				const errorText = await staffRes.text();
				setCurrentUserPermissions({
					junior_moderator: true,
					moderator: true,
					senior_moderator: false,
					owner: false
				});
			}
		} catch (error) {
			setCurrentUserPermissions({
				junior_moderator: true,
				moderator: true,
				senior_moderator: false,
				owner: false
			});
		} finally {
			setPermissionsLoading(false);
		}

		setToken1Display("");
		setToken2Display("");
		setToken1Masked("");
		setToken2Masked("");

		setIsAuthed(true);
		setError("");
	};

	const handleGenerateCodes = async (e: React.FormEvent) => {
		e.preventDefault();
		setGenLoading(true); setGenError(""); setGenSuccess(""); setCodesByTier({});
		const res = await fetch("/api/admin/promo-codes", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({ count: amount, codeType })
		});
		if (!res.ok) {
			setGenError("Failed to generate codes (check tokens and permissions)");
			setGenLoading(false);
			return;
		}
		const data = await res.json();
		setCodesByTier(data.codesByTier || {});
		const codeTypeLabel = codeType === 'ageReset' ? 'Age Reset' : 'Promo';
		setGenSuccess(`${codeTypeLabel} codes generated successfully!`);
		setGenLoading(false);
	};

	const handleCopy = async (codes: any) => {
		try {
			let textToCopy = '';

			if (codes && typeof codes === 'object' && codes.code) {
				textToCopy = codes.code;
			}
			else if (Array.isArray(codes) && codes.length > 0) {
				if (typeof codes[0] === 'string') {
					textToCopy = codes.join('\n');
				} else {
					textToCopy = codes.map((c: any) => c.code).filter(Boolean).join('\n');
				}
			}
			else if (typeof codes === 'string') {
				textToCopy = codes;
			}

			if (!textToCopy) {
				alert('No code to copy');
				return;
			}

			if (navigator.clipboard && window.isSecureContext) {
				await navigator.clipboard.writeText(textToCopy);
			} else {
				const textArea = document.createElement("textarea");
				textArea.value = textToCopy;
				textArea.style.position = "fixed";
				textArea.style.left = "-999999px";
				textArea.style.top = "-999999px";
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				document.execCommand('copy');
				textArea.remove();
			}

			alert('Code copied!');
		} catch (error) {

			alert('Failed to copy code');
		}
	};

	const handleDeleteScript = async (e: React.FormEvent) => {
		e.preventDefault();
		setDeleteLoading(true); setDeleteError(""); setDeleteSuccess("");
		const res = await fetch("/api/admin/delete-script", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({ id: deleteId })
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setDeleteError(data.error || "Failed to delete script");
			setDeleteLoading(false);
			return;
		}
		setDeleteSuccess("Script deleted successfully.");
		setDeleteLoading(false);
		setDeleteId("");
	};

	const handleDeleteAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		setDeleteAccountLoading(true); setDeleteAccountError(""); setDeleteAccountSuccess("");
		const res = await fetch("/api/admin/delete-account", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({ username: deleteUsername })
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setDeleteAccountError(data.error || "Failed to delete account");
			setDeleteAccountLoading(false);
			return;
		}
		const data = await res.json();
		setDeleteAccountSuccess("Account and all content deleted successfully.");
		setDeleteAccountLoading(false);
		setDeleteUsername("");
	};

	const handleDeleteComment = async (e: React.FormEvent) => {
		e.preventDefault();
		setDeleteCommentLoading(true); setDeleteCommentError(""); setDeleteCommentSuccess("");
		const res = await fetch("/api/admin/delete-comment", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({ commentId: deleteCommentId })
		});
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setDeleteCommentError(data.error || "Failed to delete comment");
			setDeleteCommentLoading(false);
			return;
		}
		setDeleteCommentSuccess("Comment deleted successfully.");
		setDeleteCommentLoading(false);
		setDeleteCommentId("");
	};

	const handleUpdateMultipliers = async (e: React.FormEvent) => {
		e.preventDefault();
		setUpdateMultipliersLoading(true);
		setUpdateMultipliersError("");
		setUpdateMultipliersSuccess("");

		const res = await fetch("/api/admin/update-multipliers", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({})
		});

		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setUpdateMultipliersError(data.error || "Failed to update multipliers");
			setUpdateMultipliersLoading(false);
			return;
		}

		const data = await res.json();
		setUpdateMultipliersSuccess(`Multipliers updated successfully! Updated ${data.updated} scripts.`);
		setUpdateMultipliersLoading(false);
	};

	if (loading) return (
		<div className="min-h-screen flex items-center justify-center bg-[#111827]">
			<div className="text-center">
				<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
				<div className="text-white text-lg">Loading Admin Panel...</div>
			</div>
		</div>
	);
	if (!allowed) return null;

	if (dashboardStatus === "false") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#111827]">
				<div className="text-center">
					<div className="text-red-400 text-4xl font-bold mb-4">Dashboard Disabled</div>
					<div className="text-gray-400 text-lg mb-6">The admin dashboard has been temporarily disabled.</div>
					<div className="text-gray-500 text-sm">Only users with direct database access can re-enable it.</div>
				</div>
			</div>
		);
	}

	if (!isAuthed) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-[#111827] px-4">
				<form onSubmit={handleTokenLogin} className="max-w-sm w-full bg-[#1e293b] border border-[#232b4d] rounded-xl shadow-xl p-6 sm:p-10 flex flex-col gap-5" autoComplete="off" data-form-type="other">

					<input type="text" style={{display: 'none'}} />
					<input type="password" style={{display: 'none'}} />
					<div className="text-2xl font-semibold text-white mb-2 text-center">Admin Login</div>
					<input
						type="password"
						placeholder="Admin Token 1"
						value={token1Masked}
						onChange={e => {
							const value = e.target.value;
							setToken1(value);
							setToken1Masked('*'.repeat(value.length));
						}}
						className="px-4 py-3 rounded border border-gray-700 bg-[#232b4d] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
						autoComplete="new-password"
						autoCorrect="off"
						spellCheck={false}
						data-lpignore="true"
						data-form-type="other"
						name="token1"
						id="token1"
					/>
					<input
						type="password"
						placeholder="Admin Token 2"
						value={token2Masked}
						onChange={e => {
							const value = e.target.value;
							setToken2(value);
							setToken2Masked('*'.repeat(value.length));
						}}
						className="px-4 py-3 rounded border border-gray-700 bg-[#232b4d] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
						autoComplete="new-password"
						autoCorrect="off"
						spellCheck={false}
						data-lpignore="true"
						data-form-type="other"
						name="token2"
						id="token2"
					/>
					<button
						type="submit"
						className="bg-[#2563eb] text-white font-semibold rounded px-4 py-3 hover:bg-[#1d4ed8] transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
						disabled={initialAuthLoading || permissionsLoading}
					>
						{initialAuthLoading ? "Authenticating..." : permissionsLoading ? "Setting Permissions..." : "Login"}
					</button>
					{error && <div className="text-red-400 text-sm text-center">{error}</div>}
				</form>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex bg-[#111827]">

			<button
				onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
				className="md:hidden fixed top-4 left-4 z-50 p-2 bg-[#1a2233] border border-[#232b4d] rounded-lg text-white hover:bg-[#232b4d] transition-colors"
			>
				<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>

			{isMobileMenuOpen && (
				<div
					className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
					onClick={() => setIsMobileMenuOpen(false)}
				></div>
			)}

			<aside className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#1a2233] border-r border-[#232b4d] flex flex-col py-8 px-4 min-h-screen shadow-xl transition-transform duration-300 ease-in-out`}>
				<div className="mb-8 text-2xl font-bold tracking-tight text-white">Admin Panel</div>

				<nav className="flex-1 flex flex-col gap-2">
					{getFilteredSidebarItems().length > 0 ? (
						getFilteredSidebarItems().map(item => (
							<button
								key={item.key}
								onClick={() => setSection(item.key as any)}
								className={`text-left px-3 py-2 rounded-lg font-medium transition-colors ${section === item.key ? 'bg-[#2563eb] text-white shadow' : 'text-gray-200 hover:bg-[#232b4d]'}`}
							>
								{item.label}
							</button>
						))
					) : (
						<div className="text-center p-4 text-gray-400">
							{currentUserPermissions ? 'No sections available with your permissions' : (
								<div className="flex flex-col items-center">
									<div className="w-8 h-8 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mb-2"></div>
									<span>Loading permissions...</span>
								</div>
							)}
						</div>
					)}
				</nav>

				<div className="pt-4 border-t border-[#232b4d]">
					<button
						onClick={handleLogout}
						className="w-full text-left px-3 py-2 rounded-lg font-medium text-red-400 hover:bg-red-900/20 transition-colors"
					>
						Logout
					</button>
				</div>
			</aside>

			<main className="flex-1 flex flex-col items-center justify-start py-12 px-4 md:px-6 bg-[#111827] min-h-screen pt-20 md:pt-12">

				{sessionTimeoutWarning && (
					<div className="w-full max-w-5xl mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
						<div className="text-red-400 text-center">
							<strong>Session Timeout Warning:</strong> You will be automatically logged out in 5 minutes due to inactivity.
							Move your mouse or press a key to extend your session.
							<button
								onClick={extendSession}
								className="ml-4 px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm transition-colors"
							>
								Extend Session
							</button>
						</div>
					</div>
				)}

				<div className="w-full max-w-5xl">

					{section === 'updateMultipliers' && (
						<div className="bg-[#181e2b] border border-[#232b4d] rounded-2xl shadow-2xl p-10 max-w-md mx-auto">
							{!canAccessSection('updateMultipliers') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="text-2xl font-semibold mb-4 text-white">Update Multipliers</div>
							<div className="text-gray-300 text-sm mb-6">
								This will update all script multipliers based on age, promotion tier, verification status, and bump status.
							</div>
							<form onSubmit={handleUpdateMultipliers} className="flex flex-col gap-4">
								<button
									type="submit"
									disabled={updateMultipliersLoading}
									className="bg-blue-700 text-white font-semibold rounded px-5 py-2 hover:bg-blue-800 transition-colors disabled:bg-gray-700 disabled:text-gray-400"
								>
									{updateMultipliersLoading ? 'Updating...' : 'Update All Multipliers'}
								</button>
								{updateMultipliersError && <div className="text-red-400 text-sm text-center">{updateMultipliersError}</div>}
								{updateMultipliersSuccess && <div className="text-green-400 text-sm text-center">{updateMultipliersSuccess}</div>}
							</form>
							<div className="text-xs text-gray-400 mt-4">
								This process will recalculate multipliers for all scripts based on current criteria.
							</div>
								</>
							)}
						</div>
					)}
					{section === 'promo' && (
						<div className="bg-[#181e2b] border border-[#232b4d] rounded-2xl shadow-2xl p-10">
							{!canAccessSection('promo') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="text-2xl font-semibold mb-4 text-white">Promo Code Generator</div>
									<div className="text-gray-300 text-sm mb-6">
										Generate promotion codes or special age reset codes for scripts.
									</div>
									<form onSubmit={handleGenerateCodes} className="flex flex-col gap-4">
										<div className="flex items-center gap-4 mb-4">
											<label className="text-gray-300 font-medium">Code Type:</label>
											<select
												value={codeType}
												onChange={e => setCodeType(e.target.value)}
												className="px-3 py-2 rounded border border-gray-700 bg-[#232b4d] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
											>
												<option value="promo">Promotion Codes</option>
												<option value="ageReset">Special Offer: Full Script Age Reset</option>
											</select>
										</div>
										<div className="flex items-center gap-4">
											<label className="text-gray-300 font-medium">Amount:</label>
											<input
												type="number"
												min={1}
												max={100}
												value={amount === 0 ? '' : amount}
												onChange={e => {
													const val = e.target.value;
													if (val === '') {
														setAmount(0);
														return;
													}
													const num = Number(val);
													if (isNaN(num)) return;
													if (num < 1) setAmount(1);
													else if (num > 100) setAmount(100);
													else setAmount(num);
												}}
												className="w-24 px-3 py-2 rounded border border-gray-700 bg-[#232b4d] text-white text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-600 hide-number-spin"
												inputMode="numeric"
												pattern="[0-9]*"
											/>
											<button type="submit" disabled={genLoading || amount < 1} className="ml-4 bg-blue-700 text-white font-semibold rounded px-5 py-2 hover:bg-blue-800 transition-colors disabled:bg-gray-700 disabled:text-gray-400">{genLoading ? 'Generating...' : 'Generate Codes'}</button>
										</div>
										{genError && <div className="text-red-400 text-sm text-center">{genError}</div>}
										{genSuccess && <div className="text-green-400 text-sm text-center">{genSuccess}</div>}
									</form>
									{Object.keys(codesByTier).length > 0 && (
										<div className="mt-8">
											<div className="text-lg font-semibold mb-3 text-white">Generated Codes</div>
											<div className="text-gray-400 text-sm mb-4">
												{codeType === 'ageReset' ? 'Special Offer: Full Script Age Reset Codes' : 'Promotion Codes'}
											</div>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
												{Object.entries(codesByTier).map(([tier, codes]) => (
													<div key={tier} className="bg-[#232b4d] border border-[#232b4d] rounded-xl p-4 flex flex-col">
														<div className="flex items-center justify-between mb-2">
															<span className="font-semibold text-blue-300">
																{codeType === 'ageReset' ? 'AGE RESET' : `TIER ${tier}`}
															</span>
															<button onClick={() => handleCopy(codes)} className="bg-blue-700 text-white rounded px-3 py-1 text-xs font-semibold hover:bg-blue-800">Copy</button>
														</div>
														<pre className="text-xs text-green-300 whitespace-pre-wrap break-all">{codes.join("\n")}</pre>
													</div>
												))}
											</div>
										</div>
									)}
								</>
							)}
						</div>
					)}
					{section === 'codes' && (
						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<h2 className="text-2xl font-bold text-gray-900">Current Codes</h2>
								<button
									onClick={fetchExistingCodes}
									className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									Refresh Codes
								</button>
							</div>

							{codesError && (
								<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
									{codesError}
								</div>
							)}

							<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
								<div className="bg-white p-4 rounded-lg border border-gray-200">
									<div className="text-2xl font-bold text-gray-900">{codeStats?.total || 0}</div>
									<div className="text-sm text-gray-600">Total Codes</div>
								</div>
								<div className="bg-white p-4 rounded-lg border border-gray-200">
									<div className="text-2xl font-bold text-blue-600">{codeStats?.promo || 0}</div>
									<div className="text-sm text-gray-600">Promo Codes</div>
								</div>
								<div className="bg-white p-4 rounded-lg border border-gray-200">
									<div className="text-2xl font-bold text-purple-600">{codeStats?.ageReset || 0}</div>
									<div className="text-sm text-gray-600">Age Reset</div>
								</div>
								<div className="bg-white p-4 rounded-lg border border-gray-200">
									<div className="text-2xl font-bold text-red-600">{codeStats?.used || 0}</div>
									<div className="text-sm text-gray-600">Used</div>
								</div>
								<div className="bg-white p-4 rounded-lg border border-gray-200">
									<div className="text-2xl font-bold text-green-600">{codeStats?.unused || 0}</div>
									<div className="text-sm text-gray-600">Available</div>
								</div>
							</div>

							<div className="border-b border-gray-200">
								<nav className="-mb-px flex space-x-8">
									<button
										onClick={() => setCodeTypeFilter('promo')}
										className={`py-2 px-1 border-b-2 font-medium text-sm ${
											codeTypeFilter === 'promo'
												? 'border-blue-500 text-blue-600'
												: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
										}`}
									>
										Promo Codes
									</button>
									<button
										onClick={() => setCodeTypeFilter('ageReset')}
										className={`py-2 px-1 border-b-2 font-medium text-sm ${
											codeTypeFilter === 'ageReset'
												? 'border-purple-500 text-purple-600'
												: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
										}`}
									>
										Special Offer
									</button>
								</nav>
							</div>

							{codeTypeFilter === 'promo' ? (
								<div className="space-y-6">
									<div className="flex items-center justify-between">
										<h3 className="text-lg font-semibold text-gray-900">Promo Codes by Tier</h3>
										<button
											onClick={() => {
												const allPromoCodes = Object.values(promoCodesByTier).flat().map((c: any) => c.code);
												handleCopy(allPromoCodes);
											}}
											className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
										>
											<CopyIcon />
											Copy All Promo Codes
										</button>
									</div>
									{Object.entries(promoCodesByTier).map(([tier, codes]) => (
										<div key={tier} className="bg-white rounded-lg border border-gray-200 p-6">
											<div className="flex items-center justify-between mb-4">
												<h4 className="text-lg font-semibold text-gray-900">TIER {tier}</h4>
												{codes.length > 0 && (
													<button
														onClick={() => handleCopy(codes.map((c: any) => c.code))}
														className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
													>
														<CopyIcon />
														Copy All Tier {tier} Codes
													</button>
												)}
											</div>
											{codes.length > 0 ? (
												<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
													{codes.map((codeInfo: any, index: number) => (
														<div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
															<div className="flex items-center justify-between mb-2">
																<code className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">
																	{codeInfo.code}
																</code>
																<button
																	onClick={() => handleCopy(codeInfo.code)}
																	className="text-gray-500 hover:text-gray-700"
																>
																	<CopyIcon />
																</button>
															</div>
															<div className="text-sm text-gray-600 mb-2">
																{codeInfo.description}
															</div>
															<div className="text-xs text-gray-500">
																Created: {codeInfo.createdAt ? new Date(codeInfo.createdAt).toLocaleDateString() : 'Unknown'}
															</div>
															{codeInfo.active && codeInfo.usedAt && (
																<div className="text-xs text-gray-500 mt-1">
																	Used: {(() => {
																		try {
																			const usedDate = new Date(codeInfo.usedAt);
																			if (usedDate.getTime() > 1000000000000) {
																				return usedDate.toLocaleDateString();
																			} else {
																				return 'Recently';
																			}
																		} catch {
																			return 'Recently';
																		}
																	})()}
																</div>
															)}
															<div className={`mt-2 text-xs px-2 py-1 rounded-full ${
																codeInfo.active ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
															}`}>
																{codeInfo.active ? 'Used' : 'Available'}
															</div>
														</div>
													))}
												</div>
											) : (
												<p className="text-gray-500 text-center py-4">No codes found for this tier.</p>
											)}
										</div>
									))}
									<div className="flex justify-center">
										<button
											onClick={() => handleCopy(Object.values(promoCodesByTier).flat().map((c: any) => c.code))}
											className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
										>
											Copy All Promo Codes
										</button>
									</div>
								</div>
							) : (
								<div className="space-y-6">
									<div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
										<h3 className="text-lg font-semibold text-purple-900 mb-2">Special Offer: Full Script Age Reset</h3>
										<p className="text-purple-700 text-sm">
											These codes reset a script's age to the current time. They are not connected to tiers and can be used on any script.
										</p>
									</div>

									{ageResetCodes.length > 0 ? (
										<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
											{ageResetCodes.map((codeInfo: any, index: number) => (
												<div key={index} className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
													<div className="flex items-center justify-between mb-2">
														<code className="text-sm font-mono bg-purple-100 text-purple-800 px-2 py-1 rounded">
															{codeInfo.code}
														</code>
														<button
															onClick={() => handleCopy(codeInfo.code)}
															className="text-purple-500 hover:text-purple-700"
														>
															<CopyIcon />
														</button>
													</div>
													<div className="text-sm text-gray-600 mb-2">
														{codeInfo.description}
													</div>
													<div className="text-xs text-gray-500">
														Created: {codeInfo.createdAt ? new Date(codeInfo.createdAt).toLocaleDateString() : 'Unknown'}
													</div>
													{codeInfo.active && codeInfo.usedAt && (
														<div className="text-xs text-gray-500 mt-1">
															Used: {(() => {
																try {
																	const usedDate = new Date(codeInfo.usedAt);
																	if (usedDate.getTime() > 1000000000000) {
																		return usedDate.toLocaleDateString();
																	} else {
																		return 'Recently';
																	}
																} catch {
																	return 'Recently';
																}
															})()}
														</div>
													)}
													<div className={`mt-2 text-xs px-2 py-1 rounded-full ${
														codeInfo.active ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
													}`}>
														{codeInfo.active ? 'Used' : 'Available'}
													</div>
												</div>
											))}
										</div>
									) : (
										<p className="text-gray-500 text-center py-8">No age reset codes found. Generate some codes in the Promo Code Generator section.</p>
									)}

									<div className="flex justify-center">
										<button
											onClick={() => handleCopy(ageResetCodes.map((c: any) => c.code))}
											className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
										>
											Copy All Age Reset Codes
										</button>
									</div>
								</div>
							)}

							<div className="flex justify-center pt-4">
								<button
									onClick={cleanupOldCodes}
									className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
								>
									Cleanup Old Codes
								</button>
							</div>
						</div>
					)}
					{section === 'delete' && (
						<div className="bg-[#181e2b] border border-[#232b4d] rounded-2xl shadow-2xl p-10 max-w-md mx-auto">
							{!canAccessSection('delete') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="text-2xl font-semibold mb-4 text-white">Delete Script</div>
									<div className="text-gray-300 text-sm mb-6">
										<strong>Permission Requirements:</strong><br/>
										• Junior Moderator+: Delete scripts under 30 days<br/>
										• Moderator+: Delete verified scripts and 30+ days scripts<br/>
										• Senior Moderator+: Delete promoted scripts
									</div>
							<form onSubmit={handleDeleteScript} className="flex flex-col gap-4">
								<input
									type="text"
									value={deleteId}
									onChange={e => setDeleteId(e.target.value)}
									className="px-3 py-2 rounded border border-gray-700 bg-[#232b4d] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
									placeholder="Enter script id (e.g. 1)"
								/>
								<button type="submit" disabled={deleteLoading || !deleteId} className="bg-red-700 text-white font-semibold rounded px-5 py-2 hover:bg-red-800 transition-colors disabled:bg-gray-700 disabled:text-gray-400">{deleteLoading ? 'Deleting...' : 'Delete Script'}</button>
								{deleteError && <div className="text-red-400 text-sm text-center">{deleteError}</div>}
								{deleteSuccess && <div className="text-green-400 text-sm text-center">{deleteSuccess}</div>}
							</form>
							<div className="text-xs text-gray-400 mt-4">Warning: This action is irreversible. Make sure you have the correct script id.</div>
								</>
							)}
						</div>
					)}
					{section === 'deleteAccount' && (
						<div className="bg-[#181e2b] border border-[#232b4d] rounded-2xl shadow-2xl p-10 max-w-md mx-auto">
							{!canAccessSection('deleteAccount') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="text-2xl font-semibold mb-4 text-white">Delete Account</div>
									<div className="text-gray-300 text-sm mb-6">
										<strong>Permission Requirements:</strong><br/>
										• Junior Moderator+: Delete accounts under 7 days<br/>
										• Moderator+: Delete non-verified accounts<br/>
										• Senior Moderator+: Delete all accounts except staff<br/>
										• Owner: Delete staff accounts
									</div>
		<form onSubmit={handleDeleteAccount} className="flex flex-col gap-4">
			<input
				type="text"
				value={deleteUsername}
				onChange={e => setDeleteUsername(e.target.value)}
				className="px-3 py-2 rounded border border-gray-700 bg-[#232b4d] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
				placeholder="Enter username (case-sensitive)"
			/>

			<button type="submit" disabled={deleteAccountLoading || !deleteUsername} className="bg-red-700 text-white font-semibold rounded px-5 py-2 hover:bg-red-800 transition-colors disabled:bg-gray-700 disabled:text-gray-400">{deleteAccountLoading ? 'Deleting...' : 'Delete Account'}</button>
			{deleteAccountError && <div className="text-red-400 text-sm text-center">{deleteAccountError}</div>}
			{deleteAccountSuccess && <div className="text-green-400 text-sm text-center">{deleteAccountSuccess}</div>}
		</form>
		<div className="text-xs text-gray-400 mt-4">Warning: This action is irreversible. The account will be deleted. All scripts and comments by this user will also be deleted.</div>
								</>
							)}
						</div>
					)}
					{section === 'deleteComment' && (
						<div className="bg-[#181e2b] border border-[#232b4d] rounded-2xl shadow-2xl p-10 max-w-md mx-auto">
							{!canAccessSection('deleteComment') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="text-2xl font-semibold mb-4 text-white">Delete Comment</div>
		<form onSubmit={handleDeleteComment} className="flex flex-col gap-4">
			<input
				type="text"
				value={deleteCommentId}
				onChange={e => setDeleteCommentId(e.target.value)}
				className="px-3 py-2 rounded border border-gray-700 bg-[#232b4d] text-white text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
				placeholder="Enter comment id (e.g. 68a0a89309f150a720f9e8e3)"
			/>
			<button type="submit" disabled={deleteCommentLoading || !deleteCommentId} className="bg-red-700 text-white font-semibold rounded px-5 py-2 hover:bg-red-800 transition-colors disabled:bg-gray-700 disabled:text-gray-400">{deleteCommentLoading ? 'Deleting...' : 'Delete Comment'}</button>
			{deleteCommentError && <div className="text-red-400 text-sm text-center">{deleteCommentError}</div>}
			{deleteCommentSuccess && <div className="text-green-400 text-sm text-center">{deleteCommentSuccess}</div>}
		</form>
		<div className="text-xs text-gray-400 mt-4">Warning: This action is irreversible. Make sure you have the correct comment id.</div>
								</>
							)}
						</div>
					)}
					{section === 'staffManagement' && (
						<div>
							<StaffManagement
								currentUserPermissions={currentUserPermissions}
								token1={token1}
								token2={token2}
								currentUser={currentUserInfo}
								canEditStaff={canEditStaff()}
							/>
						</div>
					)}

					{section === 'verifyAccount' && (
						<div className="bg-[#1e293b] rounded-xl border border-[#232b4d] p-6 shadow-sm">
							{!canAccessSection('verifyAccount') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<h2 className="text-xl font-semibold text-white mb-6">Verify Account</h2>
									<p className="text-gray-400 mb-6">
										Verify or remove verification from user accounts. Only Owner and Senior Moderator ranks can access this feature.
									</p>

									<div className="text-gray-300 text-sm mb-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
										<strong>Permission Requirements:</strong><br/>
										• Senior Moderator+: Verify and unverify user accounts<br/>
										• Owner: Can modify staff account verification status
									</div>

									<form onSubmit={handleVerifyAccount} className="space-y-4">
										<div>
											<label htmlFor="verifyUsername" className="block text-sm font-medium text-gray-300 mb-2">
												Username
											</label>
											<input
												type="text"
												id="verifyUsername"
												value={verifyUsername}
												onChange={(e) => setVerifyUsername(e.target.value)}
												placeholder="Enter username to verify/unverify"
												className="w-full px-4 py-2 rounded border border-gray-600 bg-[#232b4d] text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
												required
											/>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-300 mb-2">
												Action
											</label>
											<div className="flex gap-3">
												<label className="flex items-center">
													<input
														type="radio"
														name="verifyAction"
														value="verify"
														checked={verifyAction === 'verify'}
														onChange={(e) => setVerifyAction(e.target.value as 'verify' | 'unverify')}
														className="mr-2 text-blue-500 focus:ring-blue-500"
													/>
													<span className="text-gray-300">Verify Account</span>
												</label>
												<label className="flex items-center">
													<input
														type="radio"
														name="verifyAction"
														value="unverify"
														checked={verifyAction === 'unverify'}
														onChange={(e) => setVerifyAction(e.target.value as 'verify' | 'unverify')}
														className="mr-2 text-blue-500 focus:ring-blue-500"
													/>
													<span className="text-gray-300">Remove Verification</span>
												</label>
											</div>
										</div>

										<button
											type="submit"
											disabled={verifyLoading || !verifyUsername}
											className={`w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:bg-gray-600 disabled:text-gray-400 ${
												verifyAction === 'verify'
													? 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#1e293b]'
													: 'bg-orange-600 text-white hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-[#1e293b]'
											}`}
										>
											{verifyLoading ? 'Processing...' : verifyAction === 'verify' ? 'Verify Account' : 'Remove Verification'}
										</button>
									</form>

									{verifyError && (
										<div className="mt-4 bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
											{verifyError}
										</div>
									)}

									{verifySuccess && (
										<div className="mt-4 bg-green-900/50 border border-green-700 text-green-400 px-4 py-3 rounded-lg">
											{verifySuccess}
										</div>
									)}
								</>
							)}
						</div>
					)}

					{section === 'dashboardShutdown' && (
						<div className="bg-[#181e2b] border border-[#232b4d] rounded-2xl shadow-2xl p-10 max-w-md mx-auto">
							{!canAccessSection('dashboardShutdown') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="text-2xl font-semibold mb-4 text-white">Dashboard Shutdown</div>
									<div className="text-gray-300 text-sm mb-6">
										Toggle the dashboard shutdown status. When disabled, the dashboard will be inaccessible.
									</div>
									<div className="text-gray-300 text-sm mb-6">
										Current Status: <span className={`font-semibold ${dashboardStatus === 'true' ? 'text-green-400' : 'text-red-400'}`}>
											{dashboardStatus === 'true' ? 'ENABLED' : 'DISABLED'}
										</span>
									</div>
									<div className="text-gray-300 text-sm mb-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
										<strong>Permission Requirements:</strong><br/>
										• Senior Moderator+: View and shutdown dashboard
									</div>
									<button
										onClick={async () => {
											setDashboardShutdownLoading(true);
											setDashboardShutdownError("");
											setDashboardShutdownSuccess("");
											try {
														const res = await fetch("/api/admin/dashboard-shutdown", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-admin-token1": token1,
				"x-admin-token2": token2
			},
			body: JSON.stringify({})
		});
												if (res.ok) {
													const data = await res.json();
													setDashboardShutdownSuccess(data.message);
													setDashboardStatus(data.currentStatus === 'enabled' ? 'true' : 'false');
												} else {
													const errorText = await res.text();
													setDashboardShutdownError(`Failed to update dashboard shutdown status: ${errorText}`);
												}
											} catch (error) {
												setDashboardShutdownError(`Failed to update dashboard shutdown status: ${error}`);
											} finally {
												setDashboardShutdownLoading(false);
											}
										}}
										disabled={dashboardShutdownLoading}
										className="bg-red-700 text-white font-semibold rounded px-5 py-2 hover:bg-red-800 transition-colors disabled:bg-gray-700 disabled:text-gray-400"
									>
										{dashboardShutdownLoading ? 'Updating...' : 'Toggle Dashboard Shutdown'}
									</button>
									{dashboardShutdownError && <div className="text-red-400 text-sm text-center">{dashboardShutdownError}</div>}
									{dashboardShutdownSuccess && <div className="text-green-400 text-sm text-center">{dashboardShutdownSuccess}</div>}
								</>
							)}
						</div>
					)}

					{section === 'suspendAccount' && (
						<div className="space-y-6">
							{!canAccessSection('suspendAccount') ? (
								<div className="text-center">
									<div className="text-red-400 text-xl mb-2">Access Denied</div>
									<div className="text-gray-400">You don't have permission to view this section.</div>
								</div>
							) : (
								<>
									<div className="flex items-center justify-between">
										<h2 className="text-2xl font-bold text-white">Timeout Management</h2>
										<button
											onClick={handleUntimeoutExpired}
											disabled={untimeoutExpiredLoading}
											className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
										>
											{untimeoutExpiredLoading ? 'Processing...' : 'Process Expired Timeouts'}
										</button>
									</div>
									<div className="text-gray-300 text-sm mb-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
										<strong>Permission Requirements:</strong><br/>
										• Junior Moderator+: Timeout everyone except verified accounts<br/>
										• Moderator+: Timeout verified accounts<br/>
										• Owner: Timeout staff accounts
									</div>

							{untimeoutExpiredSuccess && (
								<div className="bg-green-900/50 border border-green-700 text-green-400 px-4 py-3 rounded-lg">
									{untimeoutExpiredSuccess}
								</div>
							)}

							{timeoutStats && (
								<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
									<div className="bg-[#1e293b] p-4 rounded-lg border border-[#232b4d] shadow-sm">
										<div className="text-2xl font-bold text-white">{timeoutStats.totalTimeouted || 0}</div>
										<div className="text-sm text-gray-400">Total Timeouted</div>
									</div>
									<div className="bg-[#1e293b] p-4 rounded-lg border border-[#232b4d] shadow-sm">
										<div className="text-2xl font-bold text-blue-400">{timeoutStats.activeTimeouts || 0}</div>
										<div className="text-sm text-gray-400">Active Timeouts</div>
									</div>
									<div className="bg-[#1e293b] p-4 rounded-lg border border-[#232b4d] shadow-sm">
										<div className="text-2xl font-bold text-orange-400">{timeoutStats.expiredTimeouts || 0}</div>
										<div className="text-sm text-gray-400">Expired Timeouts</div>
									</div>
									<div className="bg-[#1e293b] p-4 rounded-lg border border-[#232b4d] shadow-sm">
										<div className="text-2xl font-bold text-green-400">{timeoutStats.timeoutedUsers?.length || 0}</div>
										<div className="text-sm text-gray-400">Users to Process</div>
									</div>
								</div>
							)}

							<div className="bg-[#1e293b] rounded-xl border border-[#232b4d] p-8 shadow-sm">
								<h3 className="text-lg font-semibold text-white mb-4">Timeout/Untimeout User</h3>

								<form onSubmit={handleTimeoutUser} className="space-y-4">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-300 mb-2">
												Action
											</label>
											<select
												value={timeoutAction}
												onChange={(e) => setTimeoutAction(e.target.value as 'timeout' | 'untimeout')}
												className="w-full px-4 py-3 border border-gray-600 bg-[#232b4d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
											>
												<option value="timeout">Timeout User</option>
												<option value="untimeout">Untimeout User</option>
											</select>
										</div>

										<div>
											<label className="block text-sm font-medium text-gray-300 mb-2">
												Username
											</label>
											<input
												type="text"
												value={timeoutUsername}
												onChange={(e) => setTimeoutUsername(e.target.value)}
												className="w-full px-4 py-3 border border-gray-600 bg-[#232b4d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
												placeholder="Enter username"
												required
											/>
										</div>
									</div>

									{timeoutAction === 'timeout' && (
										<div>
											<label className="block text-sm font-medium text-gray-300 mb-2">
												Duration
											</label>
											<div className="flex items-center gap-2">
												<input
													type="number"
													value={timeoutDuration}
													onChange={(e) => setTimeoutDuration(parseInt(e.target.value))}
													min="1"
													max={timeoutDurationUnit === 'minutes' ? 525600 :
														 timeoutDurationUnit === 'hours' ? 8760 :
														 timeoutDurationUnit === 'days' ? 365 :
														 timeoutDurationUnit === 'months' ? 12 : 525600}
													className="w-24 px-4 py-2 rounded border border-gray-600 bg-[#232b4d] text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
													required
												/>
												<select
													value={timeoutDurationUnit}
													onChange={(e) => {
														const newUnit = e.target.value as 'minutes' | 'hours' | 'days' | 'months';
														setTimeoutDurationUnit(newUnit);
														if (newUnit === 'months') {
															setTimeoutDuration(1);
														} else if (newUnit === 'days') {
															setTimeoutDuration(1);
														} else if (newUnit === 'hours') {
															setTimeoutDuration(1);
														} else {
															setTimeoutDuration(60);
														}
													}}
													className="px-4 py-2 rounded border border-gray-600 bg-[#232b4d] text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
												>
													<option value="minutes">Minutes</option>
													<option value="hours">Hours</option>
													<option value="days">Days</option>
													<option value="months">Months</option>
												</select>
											</div>
											<p className="text-sm text-gray-400 mt-1">
												Maximum: 1 year ({timeoutDurationUnit === 'minutes' ? '525,600 minutes' :
																timeoutDurationUnit === 'hours' ? '8,760 hours' :
																timeoutDurationUnit === 'days' ? '365 days' :
																timeoutDurationUnit === 'months' ? '12 months' : '525,600 minutes'})
											</p>
										</div>
									)}

									{timeoutAction === 'timeout' && (
										<div>
											<label className="block text-sm font-medium text-gray-300 mb-2">
												Reason (Optional)
											</label>
											<textarea
												value={timeoutReason}
												onChange={(e) => setTimeoutReason(e.target.value)}
												className="w-full px-4 py-3 border border-gray-600 bg-[#232b4d] text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
												placeholder="Enter reason for timeout (optional)"
												rows={3}
												maxLength={500}
											/>
											<p className="text-sm text-gray-400 mt-1">
												{timeoutReason.length}/500 characters
											</p>
										</div>
									)}

									<button
										type="submit"
										disabled={timeoutLoading || !timeoutUsername}
										className={`w-full py-3 px-4 rounded-lg font-medium transition-colors disabled:bg-gray-600 disabled:text-gray-400 ${
											timeoutAction === 'timeout'
												? 'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#1e293b]'
												: 'bg-green-600 text-white hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#1e293b]'
										}`}
									>
										{timeoutLoading ? 'Processing...' : timeoutAction === 'timeout' ? 'Timeout User' : 'Untimeout User'}
									</button>
								</form>

								{timeoutError && (
									<div className="mt-4 bg-red-900/50 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
										{timeoutError}
									</div>
								)}

								{timeoutSuccess && (
									<div className="mt-4 bg-green-900/50 border border-green-700 text-green-400 px-4 py-3 rounded-lg">
										{timeoutSuccess}
									</div>
								)}
							</div>

							{timeoutStats?.timeoutedUsers && timeoutStats.timeoutedUsers.length > 0 && (
								<div className="bg-[#1e293b] rounded-xl border border-[#232b4d] p-6 shadow-sm">
									<h3 className="text-lg font-semibold text-white mb-4">Currently Timeouted Users</h3>
									<div className="overflow-x-auto">
										<table className="min-w-full divide-y divide-gray-600">
											<thead className="bg-[#232b4d]">
												<tr>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Username</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duration</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Timeout End</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Reason</th>
													<th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
												</tr>
											</thead>
											<tbody className="bg-[#1e293b] divide-y divide-gray-600">
												{timeoutStats.timeoutedUsers.map((user: any, index: number) => {
													const isExpired = new Date(user.timeoutEnd) < new Date();
													return (
														<tr key={index}>
															<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
																{user.username}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
																{user.timeoutDuration} {user.timeoutDurationUnit}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
																{new Date(user.timeoutEnd).toLocaleString()}
															</td>
															<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
																{user.timeoutReason || 'No reason specified'}
															</td>
															<td className="px-6 py-4 whitespace-nowrap">
																<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
																	isExpired
																		? 'bg-orange-900/50 text-orange-400 border border-orange-700'
																		: 'bg-red-900/50 text-red-400 border border-red-700'
																}`}>
																	{isExpired ? 'Expired' : 'Active'}
																</span>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</div>
							)}
								</>
							)}
						</div>
					)}
				</div>
			</main>

			<style jsx global>{`
  input[type=number].hide-number-spin::-webkit-inner-spin-button,
  input[type=number].hide-number-spin::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type=number].hide-number-spin {
    -moz-appearance: textfield;
  }

  input[type="password"]::-webkit-credentials-auto-fill-button {
    display: none !important;
  }
  input[type="password"]::-webkit-contacts-auto-fill-button {
    display: none !important;
  }
  input[type="password"]::-webkit-strong-password-auto-fill-button {
    display: none !important;
  }

  input[type="password"] {
    -webkit-appearance: none !important;
    -moz-appearance: none !important;
    appearance: none !important;
  }

  input[type="password"]:-webkit-autofill,
  input[type="password"]:-webkit-autofill:hover,
  input[type="password"]:-webkit-autofill:focus,
  input[type="password"]:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 30px #232b4d inset !important;
    -webkit-text-fill-color: white !important;
    transition: background-color 5000s ease-in-out 0s !important;
  }
`}</style>
		</div>
	);
}