"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Database, Link, Shield, Bell, Zap } from "lucide-react";
import { Navigation } from "@/components/navigation";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure Boss Agent and integrations</p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic configuration for Boss Agent</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Project Root Directory</p>
                    <p className="text-sm text-muted-foreground">/home/user/claude-code-connect</p>
                  </div>
                  <Button variant="outline">Change</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Webhook Port</p>
                    <p className="text-sm text-muted-foreground">3005 (Backend) / 3000 (Web)</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Timeout</p>
                    <p className="text-sm text-muted-foreground">30 minutes</p>
                  </div>
                  <Button variant="outline">Adjust</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Node.js</span>
                  <span className="font-medium">≥18.0.0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-medium">Linux</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Link className="h-5 w-5" />
                    Connected Services
                  </div>
                </CardTitle>
                <CardDescription>Manage external service integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="font-medium">Linear</span>
                      <Badge variant="outline">Connected</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Issue tracking and webhook integration</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="font-medium">GitHub</span>
                      <Badge variant="outline">Connected</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Repository and PR management</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="font-medium">Codegen</span>
                      <Badge variant="secondary">Integration</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">AI agent delegation (Phase 2)</p>
                  </div>
                  <Button variant="outline">Setup</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                      <span className="font-medium">Sentry</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Error monitoring and auto-fixing</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                      <span className="font-medium">Slack</span>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Team notifications</p>
                  </div>
                  <Button variant="outline">Connect</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </div>
                </CardTitle>
                <CardDescription>Protect your Boss Agent instance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Bot Detection</p>
                    <p className="text-sm text-muted-foreground">Prevent automated attacks</p>
                  </div>
                  <Badge variant="default">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Rate Limiting</p>
                    <p className="text-sm text-muted-foreground">100 requests per minute</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Webhook Signature Verification</p>
                    <p className="text-sm text-muted-foreground">Validates webhook authenticity</p>
                  </div>
                  <Badge variant="secondary">Optional</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">HTTPS Only</p>
                    <p className="text-sm text-muted-foreground">Enforce secure connections</p>
                  </div>
                  <Badge variant="default">Recommended</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Tokens</CardTitle>
                <CardDescription>Manage authentication tokens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">Linear API Token</p>
                    <p className="text-xs text-muted-foreground font-mono">lin_api_••••••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">Rotate</Button>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="text-sm font-medium">GitHub Token</p>
                    <p className="text-xs text-muted-foreground font-mono">ghp_••••••••••••</p>
                  </div>
                  <Button variant="outline" size="sm">Rotate</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </div>
                </CardTitle>
                <CardDescription>Configure alerts and updates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Started</p>
                    <p className="text-sm text-muted-foreground">Notify when new session begins</p>
                  </div>
                  <Badge variant="default">On</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Completed</p>
                    <p className="text-sm text-muted-foreground">Alert on successful completion</p>
                  </div>
                  <Badge variant="default">On</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Failed</p>
                    <p className="text-sm text-muted-foreground">Immediate alert on failures</p>
                  </div>
                  <Badge variant="default">On</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Updates</p>
                    <p className="text-sm text-muted-foreground">Boss Agent version updates</p>
                  </div>
                  <Badge variant="secondary">Off</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
