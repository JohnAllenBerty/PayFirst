import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
    return (
        <div className="h-full bg-gray-50 flex flex-col items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-gray-700">
                        Welcome to your dashboard! Here you can manage your account and view recent activity.
                    </p>
                    <Button>Get Started</Button>
                </CardContent>
            </Card>
        </div>
    );
}

export default Dashboard;