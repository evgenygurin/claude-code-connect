/**
 * Script to check created Linear issues
 */

import { LinearClient } from "@linear/sdk";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const client = new LinearClient({
  apiKey: process.env.LINEAR_API_TOKEN!
});

async function checkLinearIssues() {
  try {
    console.log("📋 Checking recent Linear issues...\n");

    // Get recent issues
    const issues = await client.issues({
      orderBy: "createdAt",
      first: 10
    });

    console.log(`Found ${issues.nodes.length} recent issues:\n`);

    for (const issue of issues.nodes) {
      const team = await issue.team;
      console.log(`${issue.identifier}: ${issue.title}`);
      console.log(`   Team: ${team.name}`);
      console.log(`   Status: ${(await issue.state).name}`);
      console.log(`   Priority: ${issue.priority}`);
      console.log(`   URL: ${issue.url}`);
      console.log(`   Created: ${issue.createdAt}\n`);
    }

  } catch (error) {
    console.error("❌ Error checking Linear issues:", error);
    process.exit(1);
  }
}

// Run the script
checkLinearIssues();