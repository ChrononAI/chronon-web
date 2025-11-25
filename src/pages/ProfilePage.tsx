import { useEffect, useState } from "react";
import { User, Mail, Phone, Building, Shield, ShieldUser } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { UserProfile } from "@/types/auth";

export function ProfilePage() {
  const { user } = useAuthStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const getUserProfile = async () => {
    try {
      const res = await authService.getUserProfile();
      setUserProfile(res.data.data);
    } catch (error) {
      console.log(error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  useEffect(() => {
    getUserProfile();
  }, []);

  if (!user) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6 h-full">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[90%]">
        {/* Profile Overview Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24 text-2xl">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Name
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Username
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{userProfile?.username}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email Address
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{userProfile?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Role
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {userProfile?.current_org?.role}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {userProfile?.phone_number || "Not provided"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Card */}
        <Card className="lg:col-span-2 overflow-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Name
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {userProfile?.first_name} {userProfile?.last_name}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Username
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{userProfile?.username}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Email Address
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{userProfile?.email}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Phone Number
                </label>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {userProfile?.phone_number || "Not provided"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Organization Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Organization
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {userProfile?.current_org.org_name}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Reporting Manager
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                    <ShieldUser className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {userProfile?.reporting_manager_name || "Not Assigned"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {userProfile?.entity_assignments &&
              Object.keys(userProfile.entity_assignments).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Entities</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(userProfile.entity_assignments).map(
                      ([key, value]) => (
                        <div key={key} className="space-y-2">
                          <label className="text-sm font-medium text-muted-foreground">
                            {key}
                          </label>

                          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-md">
                            <span className="text-sm">{value}</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
