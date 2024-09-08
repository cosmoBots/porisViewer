

export const ValueDateFormatter = { // ("date", 0);
    // public static String defaultDateFormatString = "dd.MM.yyyy HH:mm:ss z";
    // public static String oldNoTreatmentFormatString = "yyyy-MM-dd'T'HH:mm:ss'Z'";
    // public static String newNoTreatmentFormatString = "yyyy-MM-dd HH:mm:ss z";
    
}

export const DefaultValueDoubleFormatter = { //("double", 0);
    // public static ValueDoubleFormatter DEFAULT_DOUBLE_FORMATTER = new ValueDoubleFormatter("real", 1, "real");

}


export const ValueHMSFormatter = { // DEFAULT_HMS_FORMATTER = new ValueHMSFormatter("HH:mm:ss.sss", 2, "HH:mm:ss.sss");
//https://github.com/Starlink/starjava/blob/master/jsky/src/main/jsky/coords/HMS.java
/*
  public void setVal(double val) {
        this.val = val;

        double v = val; // check also for neg zero
        if (v < 0.0 || new Double(v).equals(minusZero)) {
            sign = -1;
            v = -v;
        }
        else {
            sign = 1;
        }

        double dd = v + 0.0000000001;
        hours = (int) dd;
        double md = (dd - hours) * 60.;
        min = (int) md;
        sec = (md - min) * 60.;
        initialized = true;
    }
    
    public String toString() {
        String secs = nf.format(sec);

        // sign
        String signStr;
        if (sign == -1)
            signStr = "-";
        else
            signStr = "";

        return signStr
                + nf.format(hours)
                + ":"
                + nf.format(min)
                + ":"
                + secs;
    }
*/
}


export const ValueDMSFormatter = { // DEFAULT_DMS_FORMATTER = new ValueDMSFormatter("DD:mm:ss.sss", 3, "DD:mm:ss.sss");
// https://github.com/Starlink/starjava/blob/master/jsky/src/main/jsky/coords/DMS.java
/*
    public void setVal(double val) {
        this.val = val;

        double v = val; // check also for neg zero
        if (v < 0.0 || new Double(v).equals(minusZero)) {
            sign = -1;
            v = -v;
        }
        else {
            sign = 1;
        }

        double dd = v + 0.0000000001;
        degrees = (int) dd;
        double md = (dd - degrees) * 60.;
        min = (int) md;
        sec = (md - min) * 60.;
        initialized = true;
    }

    public String toString() {
        String secs = nf.format(sec);

        // sign
        String signStr;
        if (sign == -1)
            signStr = "-";
        else
            signStr = "+";

        return signStr
                + nf.format(degrees)
                + ":"
                + nf.format(min)
                + ":"
                + secs;
    }
*/
}

export const AngleValueDoubleFormatter = { // ANGLE_FORMATTER = new ValueDoubleFormatter("angle", 4, "angle");

}


export const ValueDoubleFormatter { // S_FORMATTER = new ValueDoubleFormatter("s", 5, "s");

}

export const DefaultValueDateFormatter { // DEFAULT_DATE_FORMATTER = new ValueDateFormatter("Date", 6, "dd.MM.yyyy HH:mm:ss z");
}


export const ValueIntegerFormatter = { // } DEFAULT_INTEGER_FORMATTER { // = new ValueIntegerFormatter("integer", 7, "#");

}

export const ValueArcMinFormatter = { // DEFAULT_ARCMIN_FORMATTER { //= new ValueArcMinFormatter("arcmin", 8, "arcmin");
}

export const ValueArcSecFormatter = { // DEFAULT_ARCSEC_FORMATTER { //= new ValueArcSecFormatter("arcsec", 9, "arcsec");
}


export const formatters = [
    ValueDateFormatter,
    DefaultValueDoubleFormatter,
    ValueHMSFormatter,
    ValueDMSFormatter,
    AngleValueDoubleFormatter,
    ValueDoubleFormatter,
    DefaultValueDateFormatter,
    ValueIntegerFormatter,
    ValueArcMinFormatter,
    ValueArcSecFormatter
]