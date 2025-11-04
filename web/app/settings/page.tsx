"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Database, Link, Shield, Bell, Zap, Save } from "lucide-react";
import { Navigation } from "@/components/navigation";

export default function SettingsPage() {
  const { toast } = useToast();
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your configuration has been updated successfully.",
    });
  };

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
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="project-root">Project Root Directory</Label>
                  <Input
                    id="project-root"
                    defaultValue="/home/user/claude-code-connect"
                    placeholder="Enter project root path"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook-port">Webhook Port</Label>
                  <Input
                    id="webhook-port"
                    type="number"
                    defaultValue="3005"
                    placeholder="Enter port number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger id="session-timeout">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button onClick={handleSaveSettings}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </Button>
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
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive all system notifications</p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Started</p>
                    <p className="text-sm text-muted-foreground">Notify when new session begins</p>
                  </div>
                  <Switch defaultChecked disabled={!notificationsEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Completed</p>
                    <p className="text-sm text-muted-foreground">Alert on successful completion</p>
                  </div>
                  <Switch defaultChecked disabled={!notificationsEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Session Failed</p>
                    <p className="text-sm text-muted-foreground">Immediate alert on failures</p>
                  </div>
                  <Switch defaultChecked disabled={!notificationsEnabled} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">System Updates</p>
                    <p className="text-sm text-muted-foreground">Boss Agent version updates</p>
                  </div>
                  <Switch disabled={!notificationsEnabled} />
                </div>

                <div className="pt-4">
                  <Button onClick={() => {
                    toast({
                      title: "Notification settings saved",
                      description: "Your notification preferences have been updated.",
                    });
                  }}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
