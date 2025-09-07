// app/api/candidates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  VerifiedPermissionsClient,
  IsAuthorizedCommand,
} from "@aws-sdk/client-verifiedpermissions";

const client = new VerifiedPermissionsClient({ region: "eu-north-1" });

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // ✅ Decode JWT to get the user ID (sub)
    const decoded = jwt.decode(token) as { sub?: string };
    if (!decoded?.sub) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.sub;

    // ✅ Prepare AVP authorization command
    const command = new IsAuthorizedCommand({
      policyStoreId: process.env.AVP_STORE_ID!,
      principal: { entityType: "JobApp::User", entityId: userId },
      action: { actionType: "Action", actionId: "DeleteCandidate" },
      resource: { entityType: "JobApp::Candidate", entityId: params.id },
    });

    const result = await client.send(command);

    // ❌ Forbidden if AVP denies
    if (result.decision !== "ALLOW") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 👇 Actual delete (mock example — replace with DB call)
    // e.g., await prisma.candidate.delete({ where: { id: params.id } });

    return NextResponse.json({
      success: true,
      message: `Candidate ${params.id} deleted by user ${userId}`,
    });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
