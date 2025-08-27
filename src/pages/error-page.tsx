import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ErrorPage() {
    const navigate = useNavigate();

    const onRetry = () => {
        // quick reload to attempt recovery
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Alert
                role="alert"
                className="max-w-xl w-full bg-white border border-red-100 shadow-2xl rounded-2xl p-6 md:p-8 flex gap-6 items-start transform transition-all duration-300 ease-out
                  hover:scale-[1.002]"
            >
                <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-7 w-7 text-red-600"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M8.257 3.099c.765-1.36 2.682-1.36 3.447 0l6.518 11.59c.75 1.335-.213 2.98-1.724 2.98H3.463c-1.51 0-2.474-1.645-1.724-2.98L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-2.5a.75.75 0 01.75.75v1.25a.75.75 0 11-1.5 0V11.25A.75.75 0 0110 10.5z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                </div>

                <div className="flex-1">
                    <AlertTitle className="text-red-700 text-2xl md:text-3xl font-semibold mb-2">
                        Oops! Something went wrong.
                    </AlertTitle>
                    <AlertDescription className="mb-4 text-sm md:text-base text-gray-600">
                        The page you are looking for might have been removed, is temporarily unavailable, or an unexpected error occurred.
                        Try returning home or retrying the request.
                    </AlertDescription>

                    <div className="flex flex-wrap gap-3 items-center">
                        <Button
                            className="shadow-sm"
                            onClick={() => navigate("/")}
                            aria-label="Go to home page"
                        >
                            Go Home
                        </Button>

                        <Button
                            variant="outline"
                            onClick={onRetry}
                            aria-label="Retry loading this page"
                        >
                            Retry
                        </Button>

                        <span className="ml-2 text-sm text-gray-400 hidden md:inline">
                            or contact support if the problem persists
                        </span>
                    </div>
                </div>
            </Alert>
        </div>
    );
}