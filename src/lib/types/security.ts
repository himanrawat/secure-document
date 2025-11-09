export const securityLevels = ["LOW", "MEDIUM", "HIGH", "MAXIMUM"] as const;
export type SecurityLevel = (typeof securityLevels)[number];

export const violationCodes = [
	"SCREEN_RECORDING",
	"SCREEN_SHARING",
	"SCREENSHOT_ATTEMPT",
	"FOCUS_LOSS",
	"DEVTOOLS_OPENED",
	"DEVTOOLS_ATTEMPT",
	"CAMERA_OBSTRUCTED",
	"CAMERA_ABSENT",
	"EXTERNAL_CAMERA_DETECTED",
	"MULTI_PERSON",
	"NO_LIVENESS",
	"ENVIRONMENT_CHANGE",
	"NETWORK_TAMPER",
	"SESSION_TAMPER",
	"POLICY_BREACH",
] as const;
export type ViolationCode = (typeof violationCodes)[number];

export type ViewerDeviceFingerprint = {
	id: string;
	label: string;
	platform: string;
	ipAddress: string;
	createdAt: string;
};

export type DocumentPermissions = {
	maxViews: number;
	expiryDate: string;
	allowedDevices: string[];
	allowedIPs?: string[];
	securityLevel: SecurityLevel;
	maxSessionMinutes?: number;
	maxConcurrentSessions?: number;
	allowOffline?: boolean;
};

export type ViewerIdentityRequirement = {
	required: boolean;
	expectedName?: string;
	expectedPhone?: string;
	enforceMatch?: boolean;
};

export type DocumentSecurityPolicy = {
	cameraEnforcement: boolean;
	watermarking: boolean;
	screenShield: boolean;
	downloadDisabled: boolean;
	multiMonitorBlock: boolean;
	deviceLock: boolean;
	ipRestriction?: string;
	locationTracking: boolean;
	captureReaderPhoto: boolean;
};

export type ViewerProfile = {
	viewerId: string;
	name: string;
	email: string;
	organization?: string;
	device: ViewerDeviceFingerprint;
};

export type ActivityLog = {
	id: string;
	documentId: string;
	viewerId: string;
	event:
		| "VIEWER_OPENED"
		| "VIEWER_CLOSED"
		| "HEARTBEAT"
		| "SCREENSHOT_BLOCKED"
		| "SCREEN_SHARE_BLOCKED"
		| "VIOLATION"
		| "CAMERA_STATE"
		| "POLICY_CHANGED"
		| "SESSION_REVOKED";
	context?: Record<string, unknown>;
	createdAt: string;
};

export type ViolationEvent = {
	id: string;
	code: ViolationCode;
	severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
	description: string;
	evidenceUrl?: string;
	createdAt: string;
};

export type SecureDocument = {
	documentId: string;
	ownerId: string;
	title: string;
	description?: string;
	classification: "CONFIDENTIAL" | "SECRET" | "RESTRICTED";
	encryptedBlob: string;
	permissions: DocumentPermissions;
	watermarkFields: string[];
	logs: ActivityLog[];
	violations: ViolationEvent[];
	richText?: string;
	fileUrl?: string | null;
	fileName?: string;
	fileType?: string;
	policies?: DocumentSecurityPolicy;
	createdAt?: string;
	identityRequirement?: ViewerIdentityRequirement;
	locked?: boolean;
	lockedReason?: string;
	lockedAt?: string;
};

export type CameraInsight = {
	frameHash: string;
	obstructionScore: number;
	personsDetected: number;
	externalDeviceDetected: boolean;
	livenessScore: number;
	brightnessDelta: number;
	updatedAt: number;
};

export type SessionStatus = {
	id: string;
	documentId: string;
	viewerId: string;
	startedAt: number;
	expiresAt: number;
	active: boolean;
	heartbeatMs: number;
	focusLost: boolean;
	tamperHash: string;
	identityVerified: boolean;
	viewerIdentity?: {
		name?: string;
		phone?: string;
		verifiedAt?: number;
		photo?: string;
	};
};

export type SecuritySessionSnapshot = {
	status: SessionStatus;
	document: SecureDocument;
	camera: CameraInsight | null;
	logs: ActivityLog[];
	violations: ViolationEvent[];
};
