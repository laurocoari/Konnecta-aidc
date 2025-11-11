import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from "recharts";
import { TrendingUp } from "lucide-react";

interface ROIChartProps {
  investimentoTotal: number;
  prazoROI: number;
  duracaoContrato: number;
  retornoMensal: number;
  lucroAposROI: number;
}

export default function ROIChart({
  investimentoTotal,
  prazoROI,
  duracaoContrato,
  retornoMensal,
  lucroAposROI,
}: ROIChartProps) {
  
  const generateChartData = () => {
    const data = [];
    
    for (let mes = 0; mes <= duracaoContrato; mes++) {
      let lucroAcumulado = 0;
      
      if (mes === 0) {
        lucroAcumulado = -investimentoTotal;
      } else if (mes <= prazoROI) {
        // Durante o período de ROI, o lucro acumulado vai reduzindo o negativo
        lucroAcumulado = -investimentoTotal + (mes * retornoMensal);
      } else {
        // Após o ROI, começa a acumular lucro positivo
        const mesesAposROI = mes - prazoROI;
        lucroAcumulado = mesesAposROI * lucroAposROI;
      }
      
      data.push({
        mes,
        lucroAcumulado: parseFloat(lucroAcumulado.toFixed(2)),
      });
    }
    
    return data;
  };

  const chartData = generateChartData();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Evolução do Lucro Acumulado</h3>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          
          <XAxis 
            dataKey="mes" 
            label={{ value: 'Meses', position: 'insideBottom', offset: -5 }}
            className="text-muted-foreground"
          />
          
          <YAxis 
            label={{ value: 'Lucro Acumulado (R$)', angle: -90, position: 'insideLeft' }}
            tickFormatter={formatCurrency}
            className="text-muted-foreground"
          />
          
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), 'Lucro Acumulado']}
            labelFormatter={(label) => `Mês ${label}`}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          
          {/* Área de recuperação do investimento (período negativo) */}
          <ReferenceArea 
            x1={0} 
            x2={prazoROI} 
            fill="hsl(var(--destructive))" 
            fillOpacity={0.1}
            label={{ 
              value: 'Período de Recuperação', 
              position: 'top',
              fill: 'hsl(var(--muted-foreground))',
            }}
          />
          
          {/* Linha vertical marcando o break-even (ROI) */}
          <ReferenceLine 
            x={prazoROI} 
            stroke="hsl(var(--destructive))" 
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ 
              value: `Break-even (${prazoROI} meses)`, 
              position: 'top',
              fill: 'hsl(var(--destructive))',
              fontWeight: 'bold',
            }}
          />
          
          {/* Linha horizontal no zero */}
          <ReferenceLine 
            y={0} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="3 3"
          />
          
          {/* Linha de lucro acumulado */}
          <Line 
            type="monotone" 
            dataKey="lucroAcumulado" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            name="Lucro Acumulado"
            dot={{ fill: 'hsl(var(--primary))', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Legenda:</strong> A área vermelha representa o período de recuperação do investimento. 
          A linha vertical marca o ponto de break-even (ROI). Após esse ponto, inicia-se a geração de lucro líquido.
        </p>
      </div>
    </Card>
  );
}
