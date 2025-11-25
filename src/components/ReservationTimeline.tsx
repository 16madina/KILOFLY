import { Clock, Check, X, Truck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationTimelineProps {
  status: "pending" | "approved" | "rejected" | "cancelled" | "in_progress" | "delivered";
  className?: string;
}

const ReservationTimeline = ({ status, className }: ReservationTimelineProps) => {
  const steps = [
    {
      key: "pending",
      label: "En attente",
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    },
    {
      key: "approved",
      label: "Approuvée",
      icon: Check,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/20",
    },
    {
      key: "in_progress",
      label: "En transit",
      icon: Truck,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      key: "delivered",
      label: "Livrée",
      icon: CheckCircle2,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
  ];

  // Handle rejected/cancelled status
  if (status === "rejected" || status === "cancelled") {
    return (
      <div className={cn("flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20", className)}>
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <X className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-red-700 dark:text-red-300">
            {status === "rejected" ? "Réservation refusée" : "Réservation annulée"}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Cette réservation n'a pas abouti
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = steps.findIndex((step) => step.key === status);

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isUpcoming = index > currentStepIndex;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                isCompleted && "bg-green-100 dark:bg-green-900/20",
                isCurrent && step.bgColor,
                isUpcoming && "bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all",
                  isCompleted && "text-green-600 dark:text-green-400",
                  isCurrent && step.color,
                  isUpcoming && "text-muted-foreground"
                )}
              />
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p
                className={cn(
                  "font-medium transition-all",
                  isCompleted && "text-green-700 dark:text-green-300",
                  isCurrent && "text-foreground",
                  isUpcoming && "text-muted-foreground"
                )}
              >
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-sm text-muted-foreground mt-1">
                  {step.key === "pending" && "En attente de validation du voyageur"}
                  {step.key === "approved" && "Réservation confirmée, en attente du début du voyage"}
                  {step.key === "in_progress" && "Colis en cours de transport"}
                  {step.key === "delivered" && "Livraison confirmée"}
                </p>
              )}
            </div>

            {/* Checkmark for completed steps */}
            {isCompleted && (
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-2" />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReservationTimeline;
