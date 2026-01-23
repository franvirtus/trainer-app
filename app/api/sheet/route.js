import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID mancante' }, { status: 400 });
  }

  // Il server chiama Google (questo non viene mai bloccato dal CORS)
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
  
  try {
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
        return NextResponse.json({ error: 'Errore Google' }, { status: response.status });
    }

    const data = await response.text();
    
    // Restituisce il CSV puro al tuo frontend
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Errore Server' }, { status: 500 });
  }
}